
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function GET(
  request: NextRequest,
  context: Context
) {
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

    const file = await prisma.textbookFile.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        status: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        { message: "Không tìm thấy tài liệu" },
        { status: 404 }
      );
    }

    const chunks = await prisma.documentChunk.findMany({
      where: { textbookFileId: id },
      orderBy: { pageNumber: "asc" },
      select: {
        id: true,
        pageNumber: true,
        content: true,
      },
    });

    return NextResponse.json({
      success: true,
      file,
      chunks,
    });
  } catch (error) {
    console.error("GET OCR chunks error:", error);

    return NextResponse.json(
      { message: "Không thể lấy nội dung OCR" },
      { status: 500 }
    );
  }
}
