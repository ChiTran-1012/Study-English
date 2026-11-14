
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

import {
  generateWritingExercise,
  WritingGenerationError,
  type WritingDifficulty,
} from "@/app/lib/ai/generate-writing";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type GenerateWritingRequest = {
  grade: number;
  topic: string;
  difficulty: WritingDifficulty;
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

function validateRequest(
  body: unknown
): GenerateWritingRequest {
  if (!isObject(body)) {
    throw new WritingGenerationError(
      "Dữ liệu yêu cầu không hợp lệ."
    );
  }

  const {
    grade,
    topic,
    difficulty,
    questionCount,
  } = body;

  if (
    typeof grade !== "number" ||
    !Number.isInteger(grade) ||
    grade < 1 ||
    grade > 9
  ) {
    throw new WritingGenerationError(
      "Khối lớp phải nằm trong khoảng 1 đến 9."
    );
  }

  if (
    typeof topic !== "string" ||
    !topic.trim() ||
    topic.trim().length > 100
  ) {
    throw new WritingGenerationError(
      "Chủ đề phải có từ 1 đến 100 ký tự."
    );
  }

  if (
    difficulty !== "EASY" &&
    difficulty !== "MEDIUM" &&
    difficulty !== "HARD"
  ) {
    throw new WritingGenerationError(
      "Độ khó không hợp lệ."
    );
  }

  if (
    typeof questionCount !== "number" ||
    !Number.isInteger(questionCount) ||
    questionCount < 1 ||
    questionCount > 10
  ) {
    throw new WritingGenerationError(
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
    // ==================================================
    // 1. Kiểm tra cookie đăng nhập
    // ==================================================

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

    // ==================================================
    // 2. Xác thực JWT và quyền STUDENT
    // ==================================================

    let studentId: string;

    try {
      const { payload } = await jwtVerify(
        token,
        secret
      );

      if (
        payload.role !== "STUDENT" ||
        typeof payload.id !== "string" ||
        !payload.id.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Bạn không có quyền tạo bài Writing.",
          },
          { status: 403 }
        );
      }

      studentId = payload.id;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        },
        { status: 401 }
      );
    }

    // ==================================================
    // 3. Đọc JSON từ frontend
    // ==================================================

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

    // ==================================================
    // 4. Kiểm tra dữ liệu đầu vào
    // ==================================================

    const input = validateRequest(body);

    // ==================================================
    // 5. Gọi AI tạo đề Writing
    // ==================================================

    const exercise = await generateWritingExercise({
      grade: input.grade,
      topic: input.topic,
      difficulty: input.difficulty,
      questionCount: input.questionCount,
    });

    // ==================================================
    // 6. Lưu toàn bộ đề vào PostgreSQL
    // ==================================================
    // referenceAnswer chỉ lưu trong database.
    // Không gửi đáp án mẫu về frontend.

    const session = await prisma.practiceSession.create({
      data: {
        studentId,
        grade: input.grade,
        skill: "WRITING",
        difficulty: input.difficulty,
        topic: input.topic,
        exercise:
          exercise as unknown as Prisma.InputJsonValue,
      },
    });

    // ==================================================
    // 7. Loại bỏ đáp án mẫu khỏi response
    // ==================================================

    const publicQuestions = exercise.questions.map(
      (question, index) => ({
        id: String(index + 1),
        type: question.type,
        content: question.content,
        instructions: question.instructions,
        hints: question.hints,
        minWords: question.minWords,
        maxWords: question.maxWords,
      })
    );

    // ==================================================
    // 8. Trả bài Writing cho frontend
    // ==================================================

    return NextResponse.json(
      {
        success: true,
        exercise: {
          id: session.id,
          skill: "WRITING",
          title: exercise.title,
          description: exercise.description,
          topic: exercise.topic,
          questions: publicQuestions,
        },
        createdAt: session.createdAt,
        message:
          "Tạo bài luyện viết tiếng Anh thành công.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "GENERATE WRITING ERROR:",
      error
    );

    if (error instanceof WritingGenerationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Không thể tạo bài Writing. Vui lòng thử lại.",
      },
      { status: 500 }
    );
  }
}
