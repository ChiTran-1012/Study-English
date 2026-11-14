
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{ id: string }>;
};

type AIGradeResult = {
  grammarScore: number;
  vocabularyScore: number;
  feedback: string;
  strengths: string[];
  corrections: string[];
};

type GradedQuestion = {
  questionId: string;
  recordId: string;
  grammarScore: number;
  vocabularyScore: number;
  aiAverage: number;
  result: AIGradeResult;
};

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

// ======================================================
// HELPERS
// ======================================================

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 10
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is string =>
        typeof item === "string"
    )
    .slice(0, 10);
}

function parseGrade(raw: string): AIGradeResult {
  const value: unknown = JSON.parse(raw);

  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("AI trả về JSON không hợp lệ");
  }

  const data = value as Record<string, unknown>;

  if (
    !isScore(data.grammarScore) ||
    !isScore(data.vocabularyScore)
  ) {
    throw new Error(
      "AI trả về điểm Grammar/Vocabulary không hợp lệ"
    );
  }

  return {
    grammarScore: round2(data.grammarScore),
    vocabularyScore: round2(data.vocabularyScore),
    feedback:
      typeof data.feedback === "string"
        ? data.feedback
        : "",
    strengths: stringArray(data.strengths),
    corrections: stringArray(data.corrections),
  };
}

// ======================================================
// AI CHẤM GRAMMAR VÀ VOCABULARY
// ======================================================

async function gradeTranscriptWithAI(params: {
  question: string;
  transcript: string;
}): Promise<AIGradeResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Thiếu OPENAI_API_KEY");
  }

  const systemPrompt = `
You are an English language assessment assistant
for K-9 students.

Your task is to assess a student's English speaking
transcript using ONLY TWO criteria:

1. grammarScore (0-10):
- Grammatical accuracy
- Sentence structure
- Correct use of tenses
- Appropriateness for school-age learners

2. vocabularyScore (0-10):
- Word choice
- Vocabulary accuracy
- Relevance to the speaking question
- Appropriateness for the learner's level

IMPORTANT RULES:
- Evaluate only Grammar and Vocabulary.
- Do NOT evaluate pronunciation.
- Do NOT evaluate fluency.
- You do not have access to audio.
- Do not claim to have listened to the student.
- Treat the transcript as potentially imperfect
  speech recognition output.
- Do not automatically penalize informal spoken
  English when it is grammatically acceptable.
- Use age-appropriate assessment standards.
- Do not invent errors that are not present.
- Give constructive feedback in Vietnamese.
- Scores are educational estimates.

Return ONLY valid JSON in this format:

{
  "grammarScore": 0,
  "vocabularyScore": 0,
  "feedback": "Nhận xét bằng tiếng Việt",
  "strengths": ["Điểm mạnh"],
  "corrections": ["Gợi ý cải thiện"]
}

Every score must be a number between 0 and 10.
Do not include Markdown.
`;

  const userPrompt = `
Speaking question:
${params.question}

Student transcript:
${params.transcript}

Evaluate Grammar and Vocabulary only.
Return the required JSON object.
`;

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    60000
  );

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_SPEAKING_TEXT_MODEL ||
            "gpt-4o-mini",

          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],

          response_format: {
            type: "json_object",
          },

          temperature: 0.2,
        }),
        signal: controller.signal,
      }
    );

    const responseText = await response.text();

    let result: OpenAIResponse;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `OpenAI trả về dữ liệu không hợp lệ (HTTP ${response.status})`
      );
    }

    if (!response.ok) {
      throw new Error(
        result.error?.message ||
          `OpenAI API lỗi ${response.status}`
      );
    }

    const content =
      result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(
        "OpenAI không trả về kết quả chấm điểm"
      );
    }

    return parseGrade(content);
  } finally {
    clearTimeout(timeout);
  }
}

// ======================================================
// TEACHER GRADE LOCK
// ======================================================

class TeacherGradeLockedError extends Error {
  constructor() {
    super(
      "Giáo viên đã chấm bài. Không thể chấm lại bằng AI."
    );

    this.name = "TeacherGradeLockedError";
  }
}

// ======================================================
// POST - GRADE SPEAKING GRAMMAR/VOCABULARY
// ======================================================

export async function POST(
  request: NextRequest,
  context: Context
) {
  try {
    // --------------------------------------------------
    // 1. AUTHENTICATION
    // --------------------------------------------------

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    let studentId: string;

    try {
      const { payload } = await jwtVerify(
        token,
        secret
      );

      if (
        payload.role !== "STUDENT" ||
        typeof payload.id !== "string" ||
        !payload.id
      ) {
        return NextResponse.json(
          { message: "Không có quyền học sinh" },
          { status: 403 }
        );
      }

      studentId = payload.id;
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    const { id: assignmentId } = await context.params;

    if (!assignmentId) {
      return NextResponse.json(
        { message: "Thiếu assignment ID" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 2. LOAD ASSIGNMENT
    // --------------------------------------------------

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        exercise: {
          skill: "SPEAKING",
        },
        class: {
          members: {
            some: {
              studentId,
            },
          },
        },
      },
      include: {
        exercise: {
          include: {
            questions: {
              where: {
                type: "SPEAKING",
              },
              orderBy: {
                order: "asc",
              },
              select: {
                id: true,
                content: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        {
          message:
            "Không tìm thấy bài Speaking hoặc không có quyền truy cập",
        },
        { status: 404 }
      );
    }

    const questions = assignment.exercise.questions;

    if (questions.length === 0) {
      return NextResponse.json(
        { message: "Bài Speaking chưa có câu hỏi" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. LOAD SUBMISSION
    // --------------------------------------------------

    const submission = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      include: {
        speakingRecords: {
          select: {
            id: true,
            questionId: true,
            transcript: true,
            teacherGradedAt: true,
          },
        },
      },
    });

    if (!submission || !submission.submittedAt) {
      return NextResponse.json(
        {
          message:
            "Bạn cần nộp bài Speaking trước khi chấm",
        },
        { status: 400 }
      );
    }

    // Không cho chấm AI lại nếu giáo viên đã chấm.
    if (
      submission.speakingRecords.some(
        (record) => record.teacherGradedAt !== null
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Giáo viên đã chấm bài. Không thể chấm lại bằng AI.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // 4. VALIDATE TRANSCRIPTS
    // --------------------------------------------------

    const recordMap = new Map(
      submission.speakingRecords.map((record) => [
        record.questionId,
        record,
      ])
    );

    for (const question of questions) {
      const record = recordMap.get(question.id);

      if (!record) {
        return NextResponse.json(
          {
            message:
              `Câu ${question.order} chưa có bản ghi Speaking`,
          },
          { status: 400 }
        );
      }

      if (!record.transcript?.trim()) {
        return NextResponse.json(
          {
            message:
              `Câu ${question.order} chưa có transcript`,
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------
    // 5. AI GRADE
    // --------------------------------------------------

    const gradedQuestions: GradedQuestion[] = [];

    for (const question of questions) {
      const record = recordMap.get(question.id)!;

      const result = await gradeTranscriptWithAI({
        question: question.content,
        transcript: record.transcript!,
      });

      const aiAverage = round2(
        (
          result.grammarScore +
          result.vocabularyScore
        ) / 2
      );

      gradedQuestions.push({
        questionId: question.id,
        recordId: record.id,
        grammarScore: result.grammarScore,
        vocabularyScore: result.vocabularyScore,
        aiAverage,
        result,
      });
    }

    const aiAverage = round2(
      gradedQuestions.reduce(
        (sum, item) => sum + item.aiAverage,
        0
      ) / gradedQuestions.length
    );

    // --------------------------------------------------
    // 6. SAVE AI RESULTS
    // --------------------------------------------------

    await prisma.$transaction(
      async (tx) => {
        const current = await tx.submission.findUnique({
          where: {
            id: submission.id,
          },
          select: {
            id: true,
            studentId: true,
            assignmentId: true,
            submittedAt: true,
          },
        });

        if (
          !current ||
          current.studentId !== studentId ||
          current.assignmentId !== assignmentId ||
          !current.submittedAt
        ) {
          throw new Error(
            "Bài nộp đã thay đổi trong quá trình chấm"
          );
        }

        // Kiểm tra lại trước khi lưu.
        const teacherReviewed =
          await tx.speakingRecord.findFirst({
            where: {
              submissionId: submission.id,
              teacherGradedAt: {
                not: null,
              },
            },
            select: {
              id: true,
            },
          });

        if (teacherReviewed) {
          throw new TeacherGradeLockedError();
        }

        for (const item of gradedQuestions) {
          const feedbackJson = JSON.stringify({
            feedback: item.result.feedback,
            strengths: item.result.strengths,
            corrections: item.result.corrections,
            assessmentType: "AI_TEXT_GRAMMAR_VOCABULARY",
            criteriaScale: 10,
          });

          const updateResult =
            await tx.speakingRecord.updateMany({
              where: {
                id: item.recordId,
                submissionId: submission.id,
                questionId: item.questionId,
                teacherGradedAt: null,
              },
              data: {
                grammarScore: item.grammarScore,
                vocabularyScore: item.vocabularyScore,
                feedback: feedbackJson,
              },
            });

          if (updateResult.count !== 1) {
            throw new TeacherGradeLockedError();
          }

          // Không cập nhật Answer.score tại đây.
          // Vì chưa có điểm Pronunciation và Fluency.
          // Chỉ cập nhật feedback AI của Answer.

          const existingAnswer = await tx.answer.findFirst({
            where: {
              submissionId: submission.id,
              questionId: item.questionId,
            },
            select: {
              id: true,
            },
          });

          if (existingAnswer) {
            await tx.answer.update({
              where: {
                id: existingAnswer.id,
              },
              data: {
                feedback: feedbackJson,
              },
            });
          } else {
            await tx.answer.create({
              data: {
                submissionId: submission.id,
                questionId: item.questionId,
                answer:
                  recordMap.get(item.questionId)?.transcript ?? "",
                feedback: feedbackJson,
              },
            });
          }
        }

        // Không cập nhật Submission.score.
        // Chờ giáo viên chấm đủ 2 tiêu chí còn lại.
      },
      {
        timeout: 30000,
      }
    );

    // --------------------------------------------------
    // 7. RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      message:
        "AI đã chấm Grammar và Vocabulary. Đang chờ giáo viên chấm Pronunciation và Fluency.",

      submissionId: submission.id,

      // Đây là điểm trung bình AI, không phải điểm tổng.
      aiAverage,

      score: null,

      totalQuestions: gradedQuestions.length,

      gradingStatus: "WAITING_TEACHER",

      assessmentType: "AI_TEXT_GRAMMAR_VOCABULARY",

      questions: gradedQuestions.map((item) => ({
        questionId: item.questionId,

        grammarScore: item.grammarScore,
        vocabularyScore: item.vocabularyScore,

        pronunciationScore: null,
        fluencyScore: null,

        aiAverage: item.aiAverage,

        score: null,

        feedback: item.result.feedback,
        strengths: item.result.strengths,
        corrections: item.result.corrections,
      })),
    });
  } catch (error) {
    if (error instanceof TeacherGradeLockedError) {
      return NextResponse.json(
        { message: error.message },
        { status: 409 }
      );
    }

    console.error(
      "POST SPEAKING GRADE ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Không thể chấm Grammar và Vocabulary",
      },
      { status: 500 }
    );
  }
}
