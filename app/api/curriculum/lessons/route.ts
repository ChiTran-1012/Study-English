
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// =============================================
// GET /api/curriculum/lessons?unitId=UUID
// Lấy danh sách Lesson theo Unit
// Kèm từ vựng và ngữ pháp của từng Lesson
// =============================================

export async function GET(request: NextRequest) {
  try {
    // 1. Lấy unitId từ URL
    const searchParams = request.nextUrl.searchParams;
    const unitId = searchParams.get("unitId");

    // 2. Kiểm tra unitId
    if (!unitId || !unitId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu unitId",
        },
        { status: 400 }
      );
    }

    // 3. Kiểm tra Unit có tồn tại không
    const unit = await prisma.unit.findUnique({
      where: {
        id: unitId,
      },
      select: {
        id: true,
        number: true,
        title: true,
        grade: true,
        textbook: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          error: "Không tìm thấy Unit",
        },
        { status: 404 }
      );
    }

    // 4. Lấy danh sách Lesson thuộc Unit
    const lessons = await prisma.lesson.findMany({
      where: {
        unitId: unitId,
      },
      orderBy: {
        number: "asc",
      },
      select: {
        id: true,
        number: true,
        title: true,
        objectives: true,
        sourceNote: true,

        vocabulary: {
          select: {
            id: true,
            word: true,
            meaning: true,
            example: true,
          },
          orderBy: {
            word: "asc",
          },
        },

        grammar: {
          select: {
            id: true,
            structure: true,
            explanation: true,
            example: true,
          },
        },
      },
    });

    // 5. Trả kết quả JSON
    return NextResponse.json(
      {
        success: true,
        unit,
        lessons,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET LESSONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Không thể lấy danh sách Lesson",
      },
      { status: 500 }
    );
  }
}
