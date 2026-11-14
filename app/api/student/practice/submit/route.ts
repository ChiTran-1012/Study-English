
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type PracticeSkill = "READING" | "LISTENING";

type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "REORDER"
  | "MATCHING";

type StoredQuestion = {
  content: string;
  type: QuestionType;
  correctAnswer: string;
  explanation: string;
};

type StoredExercise = {
  questions: StoredQuestion[];
};

type AnswerMap = Record<string, string>;

type QuestionResult = {
  id: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
};

const READING_TYPES: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
  "REORDER",
  "MATCHING",
];

const LISTENING_TYPES: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
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

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeSentence(value: string): string {
  return normalizeText(value)
    .replace(/[.,!?;:]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMatching(
  value: string
): Map<string, string> | null {
  const pairs = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const result = new Map<string, string>();

  for (const pair of pairs) {
    const match = pair.match(/^(\d+)-([A-F])$/i);

    if (!match) {
      return null;
    }

    const position = match[1];
    const label = match[2].toUpperCase();

    if (result.has(position)) {
      return null;
    }

    result.set(position, label);
  }

  return result;
}

function isCorrectAnswer(
  question: StoredQuestion,
  studentAnswer: string
): boolean {
  const correctAnswer = question.correctAnswer;

  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
    case "FILL_BLANK":
      return (
        normalizeText(studentAnswer) ===
        normalizeText(correctAnswer)
      );

    case "REORDER":
      return (
        normalizeSentence(studentAnswer) ===
        normalizeSentence(correctAnswer)
      );

    case "MATCHING": {
      const expected = parseMatching(correctAnswer);
      const actual = parseMatching(studentAnswer);

      if (!expected || !actual) {
        return false;
      }

      if (expected.size !== actual.size) {
        return false;
      }

      for (const [position, label] of expected) {
        if (actual.get(position) !== label) {
          return false;
        }
      }

      return true;
    }

    default:
      return false;
  }
}

function isStoredExercise(
  value: unknown,
  skill: PracticeSkill
): value is StoredExercise {
  if (!isObject(value)) {
    return false;
  }

  if (
    !Array.isArray(value.questions) ||
    value.questions.length === 0 ||
    value.questions.length > 10
  ) {
    return false;
  }

  const allowedTypes =
    skill === "READING"
      ? READING_TYPES
      : LISTENING_TYPES;

  if (
    skill === "LISTENING" &&
    (typeof value.transcript !== "string" ||
      !value.transcript.trim())
  ) {
    return false;
  }

  return value.questions.every((question) => {
    if (!isObject(question)) {
      return false;
    }

    return (
      typeof question.content === "string" &&
      question.content.trim().length > 0 &&
      typeof question.correctAnswer === "string" &&
      question.correctAnswer.trim().length > 0 &&
      typeof question.explanation === "string" &&
      allowedTypes.includes(
        question.type as QuestionType
      )
    );
  });
}

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

    // 2. Xác thực học sinh
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

    // 3. Đọc dữ liệu request
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
    const rawAnswers = body.answers;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
      typeof sessionId !== "string" ||
      !uuidRegex.test(sessionId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Mã bài luyện tập không hợp lệ.",
        },
        { status: 400 }
      );
    }

    if (!isObject(rawAnswers)) {
      return NextResponse.json(
        {
          success: false,
          error: "Danh sách đáp án không hợp lệ.",
        },
        { status: 400 }
      );
    }

    if (
      Object.values(rawAnswers).some(
        (answer) =>
          typeof answer !== "string" ||
          answer.length > 2000
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Có đáp án không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const answers = rawAnswers as AnswerMap;

    // 4. Lấy bài tập thuộc về học sinh
    const session =
      await prisma.practiceSession.findFirst({
        where: {
          id: sessionId,
          studentId,
          skill: {
            in: ["READING", "LISTENING"],
          },
        },
        select: {
          id: true,
          skill: true,
          exercise: true,
          submittedAt: true,
        },
      });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Không tìm thấy bài luyện tập.",
        },
        { status: 404 }
      );
    }

    if (session.submittedAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Bài luyện tập đã được nộp.",
        },
        { status: 409 }
      );
    }

    const skill = session.skill as PracticeSkill;

    // 5. Kiểm tra dữ liệu đề đã lưu
    const storedExercise: unknown = session.exercise;

    if (!isStoredExercise(storedExercise, skill)) {
      return NextResponse.json(
        {
          success: false,
          error: "Dữ liệu bài luyện tập không hợp lệ.",
        },
        { status: 500 }
      );
    }

    const questions = storedExercise.questions;

    // 6. Kiểm tra đáp án học sinh
    const expectedIds = questions.map(
      (_, index) => String(index + 1)
    );

    const submittedIds = Object.keys(answers);

    const missingAnswers = expectedIds.some(
      (id) =>
        typeof answers[id] !== "string" ||
        !answers[id].trim()
    );

    const unknownAnswers = submittedIds.some(
      (id) => !expectedIds.includes(id)
    );

    if (
      submittedIds.length !== expectedIds.length ||
      missingAnswers ||
      unknownAnswers
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vui lòng trả lời đầy đủ các câu hỏi.",
        },
        { status: 400 }
      );
    }

    // 7. Chấm từng câu
    let correctCount = 0;

    const results: QuestionResult[] =
      questions.map((question, index) => {
        const id = String(index + 1);

        const correct = isCorrectAnswer(
          question,
          answers[id]
        );

        if (correct) {
          correctCount++;
        }

        return {
          id,
          isCorrect: correct,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
        };
      });

    // 8. Tính điểm thang 10
    const totalQuestions = questions.length;

    const score =
      Math.round(
        (correctCount / totalQuestions) * 1000
      ) / 100;

    // 9. Lưu kết quả vào PostgreSQL
    // updateMany giúp tránh nộp trùng.
    const updated =
      await prisma.practiceSession.updateMany({
        where: {
          id: sessionId,
          studentId,
          submittedAt: null,
        },
        data: {
          answers:
            answers as Prisma.InputJsonObject,
          score,
          submittedAt: new Date(),
        },
      });

    if (updated.count === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bài đã được nộp trước đó. Không thể nộp lại.",
        },
        { status: 409 }
      );
    }

    // 10. Trả kết quả sau khi đã lưu
    return NextResponse.json({
      success: true,
      skill,
      score,
      correctCount,
      totalQuestions,
      results,
      message: "Nộp bài thành công.",
    });
  } catch (error) {
    console.error(
      "STUDENT PRACTICE SUBMIT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Không thể chấm điểm bài luyện tập.",
      },
      { status: 500 }
    );
  }
}
