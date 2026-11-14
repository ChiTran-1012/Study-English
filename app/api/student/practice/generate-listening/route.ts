
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

import {
  generateListeningExercise,
  ListeningGenerationError,
  type ListeningDifficulty,
} from "@/app/lib/ai/generate-listening";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type GenerateRequest = {
  grade: number;
  topic: string;
  difficulty: ListeningDifficulty;
  questionCount: number;
};

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validateInput(
  value: unknown
): GenerateRequest {
  if (!isObject(value)) {
    throw new Error("Dữ liệu gửi lên không hợp lệ.");
  }

  const {
    grade,
    topic,
    difficulty,
    questionCount,
  } = value;

  if (
    !Number.isInteger(grade) ||
    (grade as number) < 1 ||
    (grade as number) > 9
  ) {
    throw new Error("Khối lớp phải từ 1 đến 9.");
  }

  if (
    typeof topic !== "string" ||
    !topic.trim() ||
    topic.trim().length > 100
  ) {
    throw new Error(
      "Chủ đề phải có từ 1 đến 100 ký tự."
    );
  }

  if (
    difficulty !== "EASY" &&
    difficulty !== "MEDIUM" &&
    difficulty !== "HARD"
  ) {
    throw new Error("Độ khó không hợp lệ.");
  }

  if (
    !Number.isInteger(questionCount) ||
    (questionCount as number) < 1 ||
    (questionCount as number) > 10
  ) {
    throw new Error(
      "Số câu hỏi phải từ 1 đến 10."
    );
  }

  return {
    grade: grade as number,
    topic: topic.trim(),
    difficulty,
    questionCount: questionCount as number,
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra đăng nhập
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    // 2. Xác thực JWT
    let studentId: string;

    try {
      const { payload } = await jwtVerify(
        token,
        secret
      );

      if (
        payload.role !== "STUDENT" ||
        typeof payload.id !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Chỉ học sinh mới được tạo bài luyện tập.",
          },
          { status: 403 }
        );
      }

      studentId = payload.id;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // 3. Đọc và kiểm tra dữ liệu
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Dữ liệu JSON không hợp lệ.",
        },
        { status: 400 }
      );
    }

    let input: GenerateRequest;

    try {
      input = validateInput(body);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Dữ liệu không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // 4. AI tạo nội dung Listening
    const exercise =
      await generateListeningExercise(input);

    // 5. Lưu toàn bộ bài tập và đáp án
    // vào PostgreSQL
    const session =
      await prisma.practiceSession.create({
        data: {
          studentId,
          grade: input.grade,
          skill: "LISTENING",
          difficulty: input.difficulty,
          topic: input.topic,
          exercise:
            exercise as unknown as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

    // 6. Chỉ trả dữ liệu cần thiết cho học sinh
    // Không trả transcript hoặc đáp án đúng.
    const publicQuestions = exercise.questions.map(
      (question, index) => ({
        id: String(index + 1),
        type: question.type,
        content: question.content,
        options: question.options.map((option) => ({
          label: option.label,
          content: option.content,
        })),
      })
    );

    return NextResponse.json(
      {
        success: true,
        exercise: {
          id: session.id,
          skill: "LISTENING",
          title: exercise.title,
          description: exercise.description,
          questions: publicQuestions,
          audioUrl:
            `/api/student/practice/audio?sessionId=${session.id}`,
        },
        createdAt: session.createdAt,
        message: "Tạo bài Listening thành công.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "STUDENT LISTENING GENERATE ERROR:",
      error
    );

    if (error instanceof ListeningGenerationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Không thể tạo bài Listening.",
      },
      { status: 500 }
    );
  }
}
