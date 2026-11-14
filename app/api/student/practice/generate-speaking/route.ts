
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

import {
  generateSpeakingExercise,
  SpeakingGenerationError,
  type SpeakingDifficulty,
} from "@/app/lib/ai/generate-speaking";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type GenerateRequest = {
  grade: number;
  topic: string;
  difficulty: SpeakingDifficulty;
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

  const { grade, topic, difficulty, questionCount } =
    value;

  if (
    typeof grade !== "number" ||
    !Number.isInteger(grade) ||
    grade < 1 ||
    grade > 9
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
    typeof questionCount !== "number" ||
    !Number.isInteger(questionCount) ||
    questionCount < 1 ||
    questionCount > 10
  ) {
    throw new Error(
      "Số câu hỏi phải từ 1 đến 10."
    );
  }

  return {
    grade,
    topic: topic.trim(),
    difficulty,
    questionCount,
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

    // 2. Xác thực JWT và quyền STUDENT
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

    // 3. Đọc JSON request
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

    // 4. Kiểm tra thông tin đầu vào
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

    // 5. Gọi AI tạo bài Speaking
    const exercise =
      await generateSpeakingExercise(input);

    // 6. Lưu toàn bộ đề và câu trả lời mẫu
    // vào PostgreSQL
    const session =
      await prisma.practiceSession.create({
        data: {
          studentId,
          grade: input.grade,
          skill: "SPEAKING",
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

    // 7. Loại bỏ đáp án mẫu trước khi trả frontend
    const publicQuestions = exercise.questions.map(
      (question, index) => ({
        id: String(index + 1),
        type: question.type,
        content: question.content,
        instructions: question.instructions,
        preparationSeconds:
          question.preparationSeconds,
        speakingSeconds: question.speakingSeconds,
      })
    );

    // 8. Trả bài Speaking cho học sinh
    return NextResponse.json(
      {
        success: true,
        exercise: {
          id: session.id,
          skill: "SPEAKING",
          title: exercise.title,
          description: exercise.description,
          topic: exercise.topic,
          questions: publicQuestions,
        },
        createdAt: session.createdAt,
        message: "Tạo bài Speaking thành công.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "STUDENT SPEAKING GENERATE ERROR:",
      error
    );

    if (error instanceof SpeakingGenerationError) {
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
        error: "Không thể tạo bài Speaking.",
      },
      { status: 500 }
    );
  }
}
