
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function POST(
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
    const body = await request.json();

    const { unitId, lessonId, fromPage, toPage } = body;

    if (
      !Number.isInteger(fromPage) ||
      !Number.isInteger(toPage) ||
      fromPage < 1 ||
      toPage < fromPage ||
      typeof unitId !== "string" ||
      !unitId
    ) {
      return NextResponse.json(
        { message: "Thông tin phân loại không hợp lệ" },
        { status: 400 }
      );
    }

    const file = await prisma.textbookFile.findUnique({
      where: { id },
    });

    if (!file || file.status !== "COMPLETED") {
      return NextResponse.json(
        { message: "PDF chưa được OCR thành công" },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (
      !unit ||
      unit.textbookId !== file.textbookId ||
      unit.grade !== file.grade
    ) {
      return NextResponse.json(
        { message: "Unit không thuộc bộ sách và khối lớp đã chọn" },
        { status: 400 }
      );
    }

    let selectedLessonId: string | null = null;

    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
      });

      if (!lesson || lesson.unitId !== unitId) {
        return NextResponse.json(
          { message: "Lesson không thuộc Unit đã chọn" },
          { status: 400 }
        );
      }

      selectedLessonId = lesson.id;
    }

    const chunks = await prisma.documentChunk.findMany({
      where: {
        textbookFileId: id,
        pageNumber: {
          gte: fromPage,
          lte: toPage,
        },
      },
      select: { id: true },
    });

    if (chunks.length !== toPage - fromPage + 1) {
      return NextResponse.json(
        { message: "Khoảng trang không đầy đủ hoặc không tồn tại" },
        { status: 400 }
      );
    }

    const result = await prisma.documentChunk.updateMany({
      where: {
        textbookFileId: id,
        pageNumber: {
          gte: fromPage,
          lte: toPage,
        },
      },
      data: {
        unitId,
        lessonId: selectedLessonId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã phân loại trang PDF",
      updatedPages: result.count,
    });
  } catch (error) {
    console.error("Assign pages error:", error);

    return NextResponse.json(
      { message: "Không thể phân loại nội dung PDF" },
      { status: 500 }
    );
  }
}
