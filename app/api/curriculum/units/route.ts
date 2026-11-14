
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// GET /api/curriculum/units?textbookId=...&grade=3
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const textbookId = searchParams.get("textbookId");
    const gradeParam = searchParams.get("grade");

    if (!textbookId || !gradeParam) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu textbookId hoặc grade",
        },
        { status: 400 }
      );
    }

    const grade = Number(gradeParam);

    if (!Number.isInteger(grade) || grade < 1 || grade > 9) {
      return NextResponse.json(
        {
          success: false,
          error: "Grade phải là số nguyên từ 1 đến 9",
        },
        { status: 400 }
      );
    }

    const units = await prisma.unit.findMany({
      where: {
        textbookId,
        grade,
      },
      orderBy: {
        number: "asc",
      },
      select: {
        id: true,
        number: true,
        title: true,
        description: true,
      },
    });

    return NextResponse.json({
      success: true,
      units,
    });
  } catch (error) {
    console.error("GET UNITS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Không thể lấy danh sách Unit",
      },
      { status: 500 }
    );
  }
}
