
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// GET /api/curriculum/textbooks
export async function GET() {
  try {
    const textbooks = await prisma.textbook.findMany({
      select: {
        id: true,
        name: true,
        publisher: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        textbooks,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET TEXTBOOKS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Không thể lấy danh sách sách giáo khoa",
      },
      { status: 500 }
    );
  }
}
