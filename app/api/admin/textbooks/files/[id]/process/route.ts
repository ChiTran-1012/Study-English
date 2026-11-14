
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";
import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

type OcrPage = {
  pageNumber: number;
  content: string;
};

type OcrResult = {
  success: boolean;
  totalPages?: number;
  pages?: OcrPage[];
  error?: string;
};

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

function runOcr(pdfPath: string): Promise<OcrResult> {
  return new Promise((resolve, reject) => {
    const root = process.cwd();

    const pythonPath = path.join(
      root,
      "ocr-service",
      ".venv",
      "Scripts",
      "python.exe"
    );

    const scriptPath = path.join(
      root,
      "ocr-service",
      "ocr_pdf.py"
    );

    if (!existsSync(pythonPath) || !existsSync(scriptPath)) {
      reject(new Error("Không tìm thấy Python hoặc ocr_pdf.py"));
      return;
    }

    const child = spawn(
      pythonPath,
      [scriptPath, pdfPath],
      {
        cwd: root,
        windowsHide: true,
        shell: false,
      }
    );

    let output = "";
    let errors = "";
    let settled = false;

    const timer = setTimeout(() => {
      child.kill();
      finish(new Error("OCR quá thời gian cho phép (5 phút)"));
    }, 300000);

    function finish(error?: Error, result?: OcrResult) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (error) reject(error);
      else resolve(result!);
    }

    child.stdout.on("data", (data: Buffer) => {
      output += data.toString("utf8");

      if (output.length > 20_000_000) {
        child.kill();
        finish(new Error("Kết quả OCR quá lớn"));
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      errors += data.toString("utf8");
      if (errors.length > 4000) {
        errors = errors.slice(-4000);
      }
    });

    child.on("error", (error) => finish(error));

    child.on("close", (code) => {
      if (settled) return;

      if (code !== 0) {
        finish(new Error(errors || output || "OCR thất bại"));
        return;
      }

      try {
        finish(undefined, JSON.parse(output) as OcrResult);
      } catch {
        finish(new Error("Python không trả về JSON hợp lệ"));
      }
    });
  });
}

export async function POST(
  request: NextRequest,
  context: Context
) {
  let fileId: string | undefined;
  let processingStarted = false;

  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    let payload;

    try {
      ({ payload } = await jwtVerify(token, secret));
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    if (payload.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    fileId = id;

    const file = await prisma.textbookFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json(
        { message: "Không tìm thấy tài liệu PDF" },
        { status: 404 }
      );
    }

    // Tránh xử lý trùng khi có nhiều yêu cầu đồng thời.
    const claimed = await prisma.textbookFile.updateMany({
      where: {
        id,
        status: { in: ["PENDING", "FAILED", "COMPLETED"] },
      },
      data: {
        status: "PROCESSING",
        errorMessage: null,
      },
    });

    if (claimed.count === 0) {
      return NextResponse.json(
        { message: "Tài liệu đang được xử lý" },
        { status: 409 }
      );
    }

    processingStarted = true;

    // storageKey phải là tên file UUID.pdf,
    // không được chứa đường dẫn tùy ý.
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i.test(
        file.storageKey
      )
    ) {
      throw new Error("Tên file lưu trữ không hợp lệ");
    }

    const pdfPath = path.join(
      process.cwd(),
      "storage",
      "textbooks",
      file.storageKey
    );

    if (!existsSync(pdfPath)) {
      throw new Error("File PDF không tồn tại trên ổ đĩa");
    }

    const result = await runOcr(pdfPath);

    if (!result.success || !Array.isArray(result.pages)) {
      throw new Error(result.error || "OCR không thành công");
    }

    const pages = result.pages;

    if (
      pages.length === 0 ||
      pages.some(
        (page, index) =>
          page.pageNumber !== index + 1 ||
          typeof page.content !== "string"
      )
    ) {
      throw new Error("Dữ liệu trang OCR không hợp lệ");
    }

    // Chỉ thay dữ liệu cũ khi toàn bộ OCR đã hoàn thành.
    await prisma.$transaction(
      async (tx) => {
        await tx.documentChunk.deleteMany({
          where: { textbookFileId: id },
        });

        await tx.documentChunk.createMany({
          data: pages.map((page) => ({
            textbookFileId: id,
            pageNumber: page.pageNumber,
            content: page.content,
          })),
        });

        await tx.textbookFile.update({
          where: { id },
          data: {
            status: "COMPLETED",
            errorMessage: null,
          },
        });
      },
      { timeout: 30000 }
    );

    return NextResponse.json({
      success: true,
      message: "OCR hoàn thành",
      totalPages: pages.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";

    console.error("OCR error:", error);

    if (fileId && processingStarted) {
      try {
        await prisma.textbookFile.update({
          where: { id: fileId },
          data: {
            status: "FAILED",
            errorMessage: message.slice(0, 1000),
          },
        });
      } catch (updateError) {
        console.error("Không cập nhật được trạng thái:", updateError);
      }
    }

    return NextResponse.json(
      { success: false, message: "Xử lý OCR thất bại" },
      { status: 500 }
    );
  }
}
