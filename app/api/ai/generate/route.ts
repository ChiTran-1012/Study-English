
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

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
    // 1. Kiểm tra đăng nhập
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Bạn chưa đăng nhập." },
        { status: 401 }
      );
    }

    // 2. Xác thực JWT
    try {
      const { payload } = await jwtVerify(token, secret);

      if (
        payload.role !== "TEACHER" ||
        typeof payload.id !== "string"
      ) {
        return NextResponse.json(
          { error: "Bạn không có quyền tạo bài tập AI." },
          { status: 403 }
        );
      }

    } catch {
      return NextResponse.json(
        {
          error:
            "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        },
        { status: 401 }
      );
    }

    // 3. Đọc dữ liệu từ frontend
    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return NextResponse.json(
          { error: "Dữ liệu đầu vào không hợp lệ." },
          { status: 400 }
        );
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Body phải là JSON hợp lệ." },
        { status: 400 }
      );
    }

    // 4. Lấy các tham số tạo bài
    const grade = body.grade;
    const skill = body.skill;
    const difficulty = body.difficulty;
    const questionCount = body.questionCount;

    const topic =
      typeof body.topic === "string"
        ? body.topic.trim()
        : "";

    const questionTypes = body.questionTypes;

    // 5. Kiểm tra khối lớp
    if (
      typeof grade !== "number" ||
      !Number.isInteger(grade) ||
      grade < 1 ||
      grade > 9
    ) {
      return NextResponse.json(
        { error: "Khối lớp phải từ 1 đến 9." },
        { status: 400 }
      );
    }

    // 6. Kiểm tra chủ đề
    if (!topic || topic.length > 100) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập chủ đề (tối đa 100 ký tự).",
        },
        { status: 400 }
      );
    }

    // 7. API này chỉ xử lý Reading
    if (skill !== "READING") {
      return NextResponse.json(
        {
          error:
            "API này chỉ hỗ trợ tạo bài Reading.",
        },
        { status: 400 }
      );
    }

    // 8. Kiểm tra độ khó
    if (
      difficulty !== "EASY" &&
      difficulty !== "MEDIUM" &&
      difficulty !== "HARD"
    ) {
      return NextResponse.json(
        { error: "Độ khó không hợp lệ." },
        { status: 400 }
      );
    }

    // 9. Kiểm tra số câu hỏi
    if (
      typeof questionCount !== "number" ||
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > 10
    ) {
      return NextResponse.json(
        {
          error: "Số câu hỏi phải từ 1 đến 10.",
        },
        { status: 400 }
      );
    }

    // 10. Kiểm tra dạng câu hỏi
    if (
      !Array.isArray(questionTypes) ||
      questionTypes.length === 0 ||
      questionTypes.some(
        (type) =>
          typeof type !== "string" ||
          !QUESTION_TYPES.includes(type as QuestionType)
      ) ||
      new Set(questionTypes).size !== questionTypes.length
    ) {
      return NextResponse.json(
        {
          error: "Vui lòng chọn dạng câu hỏi hợp lệ.",
        },
        { status: 400 }
      );
    }

    // 11. Gọi hàm tạo Reading dùng chung
    const result = await generateReadingExercise({
      grade,
      topic,
      difficulty: difficulty as Difficulty,
      questionCount,
      questionTypes: questionTypes as QuestionType[],
    });

    // 12. Trả kết quả về giao diện giáo viên
    return NextResponse.json({
      success: true,
      exercise: {
        ...result.exercise,
        skill: "READING",
        difficulty,
        source: "AI",
      },
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("AI READING GENERATE ERROR:", error);

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
          error:
            "OpenAI đang giới hạn yêu cầu hoặc tài khoản không đủ credit.",
          code: apiError.code || "RATE_LIMIT",
        },
        { status: 429 }
      );
    }

    if (apiError.status === 401) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key không hợp lệ hoặc đã hết hạn.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Không thể tạo bài tập Reading.",
      },
      { status: 500 }
    );
  }
}
