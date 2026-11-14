import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    let studentId: string;
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== "STUDENT") {
        return NextResponse.json(
          { message: "Chỉ học sinh mới được truy cập" },
          { status: 403 }
        );
      }
      if (typeof payload.id !== "string" || !payload.id) {
        return NextResponse.json({ message: "Token không hợp lệ" }, { status: 401 });
      }
      studentId = payload.id;
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        class: { members: { some: { studentId } } },
      },
      include: {
        exercise: {
          select: {
            id: true,
            title: true,
            description: true,
            content: true,
            audioUrl: true,
            skill: true,
            difficulty: true,
            questions: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                content: true,
                type: true,
                order: true,
                options: {
                  select: {
                    id: true,
                    label: true,
                    content: true,
                  },
                },
              },
            },
          },
        },
        submissions: {
          where: { studentId },
          select: { id: true, score: true, submittedAt: true },
        },
        class: {
          select: { id: true, name: true, code: true, grade: true },
        },
        teacher: {
          select: { id: true, name: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { message: "Không tìm thấy bài tập hoặc bạn không thuộc lớp này" },
        { status: 404 }
      );
    }

    // Không trả transcript, correctAnswer, explanation hoặc isCorrect.
    // API review riêng chỉ trả đáp án sau khi học sinh đã nộp bài.
    return NextResponse.json(assignment);
  } catch (error) {
    console.error("GET STUDENT ASSIGNMENT DETAIL ERROR:", error);
    return NextResponse.json(
      {
        message: "Lỗi server",
        ...(process.env.NODE_ENV === "development" && error instanceof Error
          ? { error: error.message }
          : {}),
      },
      { status: 500 }
    );
  }
}
