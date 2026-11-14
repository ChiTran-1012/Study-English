
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type DetectedUnit = {
  number: number;
  title: string;
  fromPage: number;
  toPage: number;
};

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    // 1. Kiểm tra quyền ADMIN
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    let payload;

    try {
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    if (payload.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // 2. Kiểm tra file PDF
    const file = await prisma.textbookFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json(
        { error: "Không tìm thấy file PDF." },
        { status: 404 }
      );
    }

    if (file.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "File chưa OCR thành công." },
        { status: 400 }
      );
    }

    // 3. Lấy toàn bộ trang OCR
    const chunks = await prisma.documentChunk.findMany({
      where: { textbookFileId: id },
      orderBy: { pageNumber: "asc" },
      select: {
        pageNumber: true,
        content: true,
      },
    });

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "File chưa có dữ liệu OCR." },
        { status: 400 }
      );
    }

    // 4. Tìm tiêu đề Unit
    const candidates: {
      number: number;
      title: string;
      page: number;
    }[] = [];

    // Nhận diện:
    // Unit 1: Hello
    // UNIT 2 - Our Names
    // Unit 3 Our Friends
    const unitRegex =
      /^\s*unit\s+(\d{1,2})\s*(?:[:.\-–]\s*|\s+)([^\r\n]{2,80})/i;

    for (const chunk of chunks) {
      const lines = chunk.content.split(/\r?\n/);

      // Ưu tiên phần đầu trang, nơi thường có tiêu đề Unit
      for (const line of lines.slice(0, 15)) {
        const match = line.trim().match(unitRegex);

        if (!match) continue;

        const number = Number(match[1]);
        const title = match[2].trim();

        if (
          !Number.isInteger(number) ||
          number < 1 ||
          number > 50 ||
          !title
        ) {
          continue;
        }

        candidates.push({
          number,
          title,
          page: chunk.pageNumber,
        });

        // Mỗi trang chỉ lấy một tiêu đề Unit
        break;
      }
    }

    // 5. Loại các kết quả trùng Unit.
    // Đây chỉ là bản đề xuất, chưa ghi database.
    const seen = new Set<number>();

    const unique = candidates
      .sort((a, b) => a.page - b.page)
      .filter((item) => {
        if (seen.has(item.number)) return false;

        seen.add(item.number);
        return true;
      });

    const lastPage =
      chunks[chunks.length - 1].pageNumber;

    const detectedUnits: DetectedUnit[] = unique.map(
      (item, index) => ({
        number: item.number,
        title: item.title,
        fromPage: item.page,
        toPage:
          index < unique.length - 1
            ? unique[index + 1].page - 1
            : lastPage,
      })
    );

    return NextResponse.json({
      success: true,
      fileId: file.id,
      textbookId: file.textbookId,
      grade: file.grade,
      totalPages: chunks.length,
      detectedUnits,
    });
  } catch (error) {
    console.error("DETECT UNITS ERROR:", error);

    return NextResponse.json(
      { error: "Không thể nhận diện Unit." },
      { status: 500 }
    );
  }
}
