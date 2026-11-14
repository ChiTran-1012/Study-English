
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

import {
  generateReadingExercise,
  ReadingGenerationError,
} from "@/app/lib/ai/generate-reading";

import {
  QUESTION_TYPES,
  type QuestionType,
} from "@/app/lib/ai-reading-validator";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Difficulty = "EASY" | "MEDIUM" | "HARD";

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra cookie đăng nhập
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

    // 2. Xác thực JWT và quyền học sinh
    let studentId: string;

    try {
      const { payload } = await jwtVerify(token, secret);

      if (
        payload.role !== "STUDENT" ||
        typeof payload.id !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Bạn không có quyền truy cập.",
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

    // 3. Đọc JSON từ frontend
    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Dữ liệu đầu vào không hợp lệ.",
          },
          { status: 400 }
        );
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Body phải là JSON hợp lệ.",
        },
        { status: 400 }
      );
    }

    // 4. Lấy thông tin bài luyện tập
    const grade = body.grade;
    const skill = body.skill;
    const difficulty = body.difficulty;
    const questionCount = body.questionCount;

    const topic =
      typeof body.topic === "string"
        ? body.topic.trim()
        : "";

    // 5. Kiểm tra dữ liệu đầu vào
    if (
      typeof grade !== "number" ||
      !Number.isInteger(grade) ||
      grade < 1 ||
      grade > 9
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Khối lớp phải từ 1 đến 9.",
        },
        { status: 400 }
      );
    }

    if (skill !== "READING") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Hiện tại chức năng tự luyện AI mới hỗ trợ Reading.",
        },
        { status: 400 }
      );
    }

    if (
      difficulty !== "EASY" &&
      difficulty !== "MEDIUM" &&
      difficulty !== "HARD"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Độ khó không hợp lệ.",
        },
        { status: 400 }
      );
    }

    if (!topic || topic.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Chủ đề phải có từ 1 đến 100 ký tự.",
        },
        { status: 400 }
      );
    }

    if (
      typeof questionCount !== "number" ||
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > 10
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Số câu hỏi phải từ 1 đến 10.",
        },
        { status: 400 }
      );
    }

    // 6. Xác định các dạng câu hỏi
    // Nếu frontend chưa gửi questionTypes,
    // mặc định sử dụng cả 5 dạng.
    const rawQuestionTypes =
      body.questionTypes === undefined
        ? [...QUESTION_TYPES]
        : body.questionTypes;

    if (
      !Array.isArray(rawQuestionTypes) ||
      rawQuestionTypes.length === 0 ||
      rawQuestionTypes.some(
        (type) =>
          typeof type !== "string" ||
          !QUESTION_TYPES.includes(type as QuestionType)
      ) ||
      new Set(rawQuestionTypes).size !==
        rawQuestionTypes.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Danh sách dạng câu hỏi không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const questionTypes =
      rawQuestionTypes as QuestionType[];

    // 7. Tạo Reading bằng cùng logic của giáo viên
    const result = await generateReadingExercise({
      grade,
      topic,
      difficulty: difficulty as Difficulty,
      questionCount,
      questionTypes,
    });

    // 8. Lưu toàn bộ đề và đáp án vào database
    const session = await prisma.practiceSession.create({
      data: {
        studentId,
        grade,
        skill: "READING",
        difficulty: difficulty as Difficulty,
        topic,
        exercise:
          result.exercise as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    // 9. Loại bỏ đáp án và giải thích trước khi trả
    const publicQuestions = result.exercise.questions.map(
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

    // 10. Trả đề cho học sinh
    return NextResponse.json({
      success: true,
      exercise: {
        id: session.id,
        title: result.exercise.title,
        description: result.exercise.description,
        content: result.exercise.content,
        questions: publicQuestions,
      },
      metadata: {
        grade,
        topic,
        difficulty,
        skill: "READING",
        questionCount: publicQuestions.length,
        questionTypes,
        generationMode: result.metadata.generationMode,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "STUDENT PRACTICE GENERATE ERROR:",
      error
    );

    if (error instanceof ReadingGenerationError) {
      const invalidInput =
        error.message ===
        "Thông tin tạo bài Reading không hợp lệ.";

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          validationErrors: error.validationErrors,
        },
        { status: invalidInput ? 400 : 422 }
      );
    }

    const apiError = error as {
      status?: number;
      code?: string;
    };

    if (
      apiError.status === 429 ||
      apiError.code === "insufficient_quota" ||
      apiError.code === "credit_balance_exhausted"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OpenAI đang giới hạn yêu cầu hoặc không đủ credit.",
        },
        { status: 429 }
      );
    }

    if (apiError.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key không hợp lệ.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Không thể tạo bài luyện tập Reading.",
      },
      { status: 500 }
    );
  }
}
