
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

import {
  evaluateSpeaking,
  SpeakingEvaluationError,
  type SpeakingEvaluation,
  type SpeakingQuestionType,
} from "@/app/lib/ai/evaluate-speaking";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Difficulty = "EASY" | "MEDIUM" | "HARD";

type StoredQuestion = {
  content: string;
  type: SpeakingQuestionType;
  referenceAnswer: string;
  keywords: string[];
};

type QuestionEvaluation = {
  id: string;
  question: string;
  transcript: string;
  evaluation: SpeakingEvaluation;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const QUESTION_TYPES: SpeakingQuestionType[] = [
  "READ_ALOUD",
  "SHORT_ANSWER",
  "DESCRIPTION",
  "ROLE_PLAY",
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

function isStoredQuestion(
  value: unknown
): value is StoredQuestion {
  if (!isObject(value)) return false;

  return (
    typeof value.content === "string" &&
    value.content.trim().length > 0 &&
    typeof value.type === "string" &&
    QUESTION_TYPES.includes(
      value.type as SpeakingQuestionType
    ) &&
    typeof value.referenceAnswer === "string" &&
    value.referenceAnswer.trim().length > 0 &&
    Array.isArray(value.keywords) &&
    value.keywords.every(
      (keyword) => typeof keyword === "string"
    )
  );
}

function parseTranscripts(
  value: unknown
): Record<string, string> | null {
  if (!isObject(value)) return null;

  const entries = Object.entries(value);

  if (
    entries.length === 0 ||
    entries.length > 10
  ) {
    return null;
  }

  const transcripts: Record<string, string> = {};

  for (const [id, transcript] of entries) {
    if (
      !/^[1-9]\d*$/.test(id) ||
      typeof transcript !== "string" ||
      !transcript.trim() ||
      transcript.length > 5000
    ) {
      return null;
    }

    transcripts[id] = transcript.trim();
  }

  return transcripts;
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

    // 2. Xác thực quyền học sinh
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
            error: "Bạn không có quyền nộp bài.",
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

    // 3. Đọc dữ liệu gửi lên
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
    const transcripts = parseTranscripts(
      body.transcripts
    );

    if (
      typeof sessionId !== "string" ||
      !UUID_REGEX.test(sessionId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Mã bài Speaking không hợp lệ.",
        },
        { status: 400 }
      );
    }

    if (!transcripts) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Danh sách câu trả lời Speaking không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // 4. Lấy bài Speaking của học sinh
    const session =
      await prisma.practiceSession.findFirst({
        where: {
          id: sessionId,
          studentId,
          skill: "SPEAKING",
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
          error: "Không tìm thấy bài Speaking.",
        },
        { status: 404 }
      );
    }

    if (session.submittedAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Bài Speaking đã được nộp.",
        },
        { status: 409 }
      );
    }

    // 5. Kiểm tra đề đã lưu
    const exercise: unknown = session.exercise;

    if (
      !isObject(exercise) ||
      !Array.isArray(exercise.questions) ||
      exercise.questions.length === 0 ||
      exercise.questions.length > 10 ||
      !exercise.questions.every(isStoredQuestion)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Dữ liệu đề Speaking không hợp lệ.",
        },
        { status: 500 }
      );
    }

    const questions: StoredQuestion[] =
      exercise.questions;

    // 6. Kiểm tra học sinh trả lời đủ câu
    const expectedIds = questions.map(
      (_, index) => String(index + 1)
    );

    const submittedIds = Object.keys(transcripts);

    if (
      submittedIds.length !== expectedIds.length ||
      expectedIds.some(
        (id) => !transcripts[id]?.trim()
      ) ||
      submittedIds.some(
        (id) => !expectedIds.includes(id)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vui lòng hoàn thành tất cả câu hỏi Speaking.",
        },
        { status: 400 }
      );
    }

    // 7. AI chấm điểm từng câu Speaking
    const evaluations: QuestionEvaluation[] = [];

    for (
      let index = 0;
      index < questions.length;
      index++
    ) {
      const question = questions[index];
      const id = String(index + 1);

      const evaluation = await evaluateSpeaking({
        grade: session.grade,
        topic: session.topic,
        difficulty:
          session.difficulty as Difficulty,
        questionType: question.type,
        question: question.content,
        referenceAnswer: question.referenceAnswer,
        keywords: question.keywords,
        transcript: transcripts[id],
      });

      evaluations.push({
        id,
        question: question.content,
        transcript: transcripts[id],
        evaluation,
      });
    }

    // 8. Tính điểm trung bình thang 10
    const totalScore = evaluations.reduce(
      (sum, item) => sum + item.evaluation.score,
      0
    );

    const score =
      Math.round(
        (totalScore / evaluations.length) * 100
      ) / 100;

    // 9. Lưu kết quả vào PostgreSQL
    // updateMany ngăn ghi đè nếu bài đã nộp.
    const updated =
      await prisma.practiceSession.updateMany({
        where: {
          id: sessionId,
          studentId,
          skill: "SPEAKING",
          submittedAt: null,
        },
        data: {
          answers:
            {
              transcripts,
              evaluations,
            } as unknown as Prisma.InputJsonObject,
          score,
          submittedAt: new Date(),
        },
      });

    if (updated.count === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bài Speaking đã được nộp trước đó.",
        },
        { status: 409 }
      );
    }

    // 10. Trả kết quả cho frontend
    return NextResponse.json({
      success: true,
      skill: "SPEAKING",
      sessionId,
      score,
      totalQuestions: questions.length,
      results: evaluations,
      message:
        "Nộp bài Speaking và chấm điểm thành công.",
    });
  } catch (error) {
    console.error(
      "SPEAKING SUBMIT ERROR:",
      error
    );

    if (error instanceof SpeakingEvaluationError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI chưa thể đánh giá bài Speaking. Vui lòng thử lại.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Không thể nộp bài Speaking.",
      },
      { status: 500 }
    );
  }
}
