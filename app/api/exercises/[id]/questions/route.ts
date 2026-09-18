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

// GET: lấy danh sách câu hỏi của bài tập
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

    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        { message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;
    const { id: exerciseId } = await context.params;

    // Kiểm tra bài tập có thuộc Teacher này không
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        teacherId,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { message: "Không tìm thấy bài tập" },
        { status: 404 }
      );
    }

    const questions = await prisma.question.findMany({
      where: {
        exerciseId,
      },
      include: {
        options: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("GET QUESTIONS ERROR:", error);

    return NextResponse.json(
      { message: "Lỗi server" },
      { status: 500 }
    );
  }
}

// POST: tạo câu hỏi
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
    const { id: exerciseId } = await context.params;

    // Kiểm tra bài tập
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        teacherId,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { message: "Không tìm thấy bài tập" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const {
      content,
      type,
      order,
      explanation,
      correctAnswer,
    } = body;

    if (!content || !type) {
      return NextResponse.json(
        { message: "content và type là bắt buộc" },
        { status: 400 }
      );
    }

    const question = await prisma.question.create({
      data: {
        exerciseId,
        content,
        type,
        order: order ?? 1,
        explanation: explanation || null,
        correctAnswer: correctAnswer || null,
      },
      include: {
        options: true,
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error("POST QUESTION ERROR:", error);

    return NextResponse.json(
      { message: "Lỗi server" },
      { status: 500 }
    );
  }
}