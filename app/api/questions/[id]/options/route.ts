import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{
    id: string;
  }>;
};

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

    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        { message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;
    const { id: questionId } = await context.params;

    // Lấy question + exercise
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        exercise: {
          teacherId,
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { message: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const {
      label,
      content,
      isCorrect,
    } = body;

    if (!label || !content) {
      return NextResponse.json(
        { message: "label và content là bắt buộc" },
        { status: 400 }
      );
    }

    const option = await prisma.questionOption.create({
      data: {
        questionId,
        label,
        content,
        isCorrect: isCorrect ?? false,
      },
    });

    return NextResponse.json(option, { status: 201 });
  } catch (error) {
    console.error("POST OPTION ERROR:", error);

    return NextResponse.json(
      { message: "Lỗi server" },
      { status: 500 }
    );
  }
}