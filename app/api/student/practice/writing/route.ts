
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

import {
  evaluateWriting,
  WritingEvaluationError,
  type WritingEvaluation,
  type WritingQuestionType,
} from "@/app/lib/ai/evaluate-writing";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type StoredWritingQuestion = {
  content: string;
  type: WritingQuestionType;
  instructions: string;
  referenceAnswer: string;
  minWords: number;
  maxWords: number;
};

type QuestionResult = {
  id: string;
  question: string;
  studentAnswer: string;
  evaluation: WritingEvaluation;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const QUESTION_TYPES: WritingQuestionType[] = [
  "WORD_WRITING",
  "SENTENCE_WRITING",
  "PARAGRAPH_WRITING",
  "GUIDED_WRITING",
];

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isStoredWritingQuestion(
  value: unknown
): value is StoredWritingQuestion {
  if (!isObject(value)) return false;

  return (
    typeof value.content === "string" &&
    value.content.trim().length > 0 &&
    value.content.length <= 2000 &&
    typeof value.type === "string" &&
    QUESTION_TYPES.includes(
      value.type as WritingQuestionType
    ) &&
    typeof value.instructions === "string" &&
    value.instructions.length <= 2000 &&
    typeof value.referenceAnswer === "string" &&
    value.referenceAnswer.trim().length > 0 &&
    value.referenceAnswer.length <= 5000 &&
    typeof value.minWords === "number" &&
    Number.isInteger(value.minWords) &&
    value.minWords >= 1 &&
    typeof value.maxWords === "number" &&
    Number.isInteger(value.maxWords) &&
    value.maxWords <= 200 &&
    value.minWords <= value.maxWords
  );
}

function parseAnswers(
  value: unknown
): Record<string, string> | null {
  if (!isObject(value)) return null;

  const entries = Object.entries(value);

  if (entries.length < 1 || entries.length > 10) {
    return null;
  }

  const answers: Record<string, string> = {};

  for (const [id, answer] of entries) {
    if (
      !/^[1-9]\d*$/.test(id) ||
      typeof answer !== "string" ||
      !answer.trim() ||
      answer.length > 10000
    ) {
      return null;
    }

    answers[id] = answer.trim();
  }

  return answers;
}

export async function POST(request: NextRequest) {
  try {
    // ==============================================
    // 1. Kiểm tra đăng nhập
    // ==============================================

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

    // ==============================================
    // 2. Xác thực JWT và quyền STUDENT
    // ==============================================

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
            error: "Bạn không có quyền nộp bài Writing.",
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

    // ==============================================
    // 3. Đọc dữ liệu JSON
    // ==============================================

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

    if (!isObject(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Dữ liệu nộp bài không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const sessionId = body.sessionId;
    const answers = parseAnswers(body.answers);

    if (
      typeof sessionId !== "string" ||
      !UUID_REGEX.test(sessionId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Mã bài Writing không hợp lệ.",
        },
        { status: 400 }
      );
    }

    if (!answers) {
      return NextResponse.json(
        {
          success: false,
          error: "Danh sách câu trả lời không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // ==============================================
    // 4. Lấy bài Writing từ PostgreSQL
    // ==============================================

    const session =
      await prisma.practiceSession.findFirst({
        where: {
          id: sessionId,
          studentId,
          skill: "WRITING",
        },
        select: {
          id: true,
          grade: true,
          topic: true,
          difficulty: true,
          exercise: true,
          submittedAt: true,
        },
      });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Không tìm thấy bài Writing.",
        },
        { status: 404 }
      );
    }

    if (session.submittedAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Bài Writing đã được nộp.",
        },
        { status: 409 }
      );
    }

    // ==============================================
    // 5. Kiểm tra dữ liệu đề Writing
    // ==============================================

    const exercise: unknown = session.exercise;

    if (
      !isObject(exercise) ||
      !Array.isArray(exercise.questions) ||
      exercise.questions.length < 1 ||
      exercise.questions.length > 10 ||
      !exercise.questions.every(isStoredWritingQuestion)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Dữ liệu đề Writing không hợp lệ.",
        },
        { status: 500 }
      );
    }

    const questions: StoredWritingQuestion[] =
      exercise.questions;

    // ==============================================
    // 6. Kiểm tra số lượng câu trả lời
    // ==============================================

    const expectedIds = questions.map(
      (_, index) => String(index + 1)
    );

    const submittedIds = Object.keys(answers);

    if (
      submittedIds.length !== expectedIds.length ||
      expectedIds.some((id) => !answers[id]) ||
      submittedIds.some(
        (id) => !expectedIds.includes(id)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vui lòng hoàn thành tất cả câu hỏi Writing.",
        },
        { status: 400 }
      );
    }

    // ==============================================
    // 7. AI chấm từng câu Writing
    // ==============================================

    const evaluations: QuestionResult[] = [];

    for (
      let index = 0;
      index < questions.length;
      index++
    ) {
      const question = questions[index];
      const id = String(index + 1);

      const evaluation = await evaluateWriting({
        grade: session.grade,
        topic: session.topic,
        difficulty: session.difficulty,
        questionType: question.type,
        question: question.content,
        instructions: question.instructions,
        referenceAnswer: question.referenceAnswer,
        minWords: question.minWords,
        maxWords: question.maxWords,
        studentAnswer: answers[id],
      });

      evaluations.push({
        id,
        question: question.content,
        studentAnswer: answers[id],
        evaluation,
      });
    }

    // ==============================================
    // 8. Tính điểm trung bình thang 10
    // ==============================================

    const totalScore = evaluations.reduce(
      (sum, item) => sum + item.evaluation.score,
      0
    );

    const score =
      Math.round(
        (totalScore / evaluations.length) * 100
      ) / 100;

    // ==============================================
    // 9. Lưu kết quả vào PostgreSQL
    // ==============================================

    const saved =
      await prisma.practiceSession.updateMany({
        where: {
          id: sessionId,
          studentId,
          skill: "WRITING",
          submittedAt: null,
        },
        data: {
          answers: {
            studentAnswers: answers,
            evaluations,
          } as unknown as Prisma.InputJsonObject,
          score,
          submittedAt: new Date(),
        },
      });

    if (saved.count === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Bài Writing đã được nộp trước đó.",
        },
        { status: 409 }
      );
    }

    // ==============================================
    // 10. Trả kết quả về frontend
    // ==============================================

    return NextResponse.json({
      success: true,
      skill: "WRITING",
      sessionId,
      score,
      totalQuestions: questions.length,
      results: evaluations,
      message:
        "Nộp bài Writing và chấm điểm thành công.",
    });
  } catch (error) {
    console.error("WRITING SUBMIT ERROR:", error);

    if (error instanceof WritingEvaluationError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI chưa thể chấm bài Writing. Vui lòng thử lại.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Không thể nộp bài Writing.",
      },
      { status: 500 }
    );
  }
}
