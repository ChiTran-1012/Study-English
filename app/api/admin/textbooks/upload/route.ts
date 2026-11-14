
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";
import {
  MAX_PDF_SIZE,
  saveTextbookPdf,
  deleteTextbookPdf,
} from "@/app/lib/textbooks-storage";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) return false;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    return payload.role === "ADMIN";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return jsonError("Không có quyền upload sách.", 403);
  }

  let storageKey: string | null = null;

  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const textbookId = formData.get("textbookId");
    const gradeRaw = formData.get("grade");
    const displayNameRaw = formData.get("displayName");

    if (!(file instanceof File)) {
      return jsonError("Vui lòng chọn file PDF.", 400);
    }

    if (
      typeof textbookId !== "string" ||
      typeof gradeRaw !== "string" ||
      typeof displayNameRaw !== "string"
    ) {
      return jsonError("Thiếu thông tin sách.", 400);
    }

    const grade = Number(gradeRaw);
    const displayName = displayNameRaw.trim();

    if (
      !Number.isInteger(grade) ||
      grade < 1 ||
      grade > 9
    ) {
      return jsonError("Khối lớp phải từ 1 đến 9.", 400);
    }

    if (!displayName || displayName.length > 200) {
      return jsonError("Tên tài liệu không hợp lệ.", 400);
    }

    if (
      file.size === 0 ||
      file.size > MAX_PDF_SIZE
    ) {
      return jsonError(
        "File PDF phải có dung lượng từ 1 byte đến 30 MB.",
        400
      );
    }

    if (file.type !== "application/pdf") {
      return jsonError("Chỉ chấp nhận file PDF.", 400);
    }

    const textbook = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: { id: true },
    });

    if (!textbook) {
      return jsonError("Không tìm thấy bộ sách.", 404);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const header = buffer.subarray(0, 5).toString("ascii");

    if (header !== "%PDF-") {
      return jsonError("File không có định dạng PDF hợp lệ.", 400);
    }

    storageKey = await saveTextbookPdf(buffer);

    const record = await prisma.textbookFile.create({
      data: {
        textbookId,
        grade,
        displayName,
        originalName: file.name.slice(0, 255),
        storageKey,
        mimeType: "application/pdf",
        sizeBytes: file.size,
        status: "PENDING",
      },
      select: {
        id: true,
        displayName: true,
        grade: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, file: record },
      { status: 201 }
    );
  } catch (error) {
    console.error("UPLOAD TEXTBOOK ERROR:", error);

    if (storageKey) {
      try {
        await deleteTextbookPdf(storageKey);
      } catch (cleanupError) {
        console.error("FILE CLEANUP ERROR:", cleanupError);
      }
    }

    return jsonError("Upload PDF thất bại.", 500);
  }
}
