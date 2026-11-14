
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{
    id: string;
    submissionId: string;
  }>;
};

type GradeBody = {
  questionId: string;
  pronunciationScore: number;
  fluencyScore: number;
  feedback?: string;
};

function validScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 10
  );
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Không thể lưu điểm Speaking";
}

export async function POST(
  request: NextRequest,
  context: Context
) {
  try {
    // ==========================================
    // 1. AUTHENTICATION
    // ==========================================

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    let teacherId: string;

    try {
      const { payload } = await jwtVerify(token, secret);

      if (
        payload.role !== "TEACHER" ||
        typeof payload.id !== "string"
      ) {
        return NextResponse.json(
          { message: "Không có quyền giáo viên" },
          { status: 403 }
        );
      }

      teacherId = payload.id;
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    // ==========================================
    // 2. PARAMS
    // ==========================================

    const {
      id: assignmentId,
      submissionId,
    } = await context.params;

    // ==========================================
    // 3. VALIDATE REQUEST BODY
    // ==========================================

    let body: GradeBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Body JSON không hợp lệ" },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body.questionId !== "string" ||
      !body.questionId.trim() ||
      !validScore(body.pronunciationScore) ||
      !validScore(body.fluencyScore) ||
      (body.feedback !== undefined &&
        typeof body.feedback !== "string")
    ) {
      return NextResponse.json(
        {
          message:
            "Dữ liệu chấm điểm không hợp lệ. Điểm phải từ 0 đến 10.",
        },
        { status: 400 }
      );
    }

    if ((body.feedback?.length ?? 0) > 5000) {
      return NextResponse.json(
        {
          message: "Nhận xét không được quá 5000 ký tự",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 4. VERIFY ASSIGNMENT OWNERSHIP
    // ==========================================

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId,
        class: {
          teacherId,
        },
        exercise: {
          skill: "SPEAKING",
        },
      },
      select: {
        id: true,
        classId: true,
        exercise: {
          select: {
            questions: {
              where: {
                type: "SPEAKING",
              },
              select: {
                id: true,
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
            "Không tìm thấy bài Speaking hoặc không có quyền chấm",
        },
        { status: 404 }
      );
    }

    const questions = assignment.exercise.questions;

    const currentQuestion = questions.find(
      (question) => question.id === body.questionId
    );

    if (!currentQuestion) {
      return NextResponse.json(
        {
          message:
            "Câu hỏi Speaking không thuộc bài tập này",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // 5. VERIFY SUBMISSION
    // ==========================================

    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        assignmentId,
        submittedAt: {
          not: null,
        },
        student: {
          classMembers: {
            some: {
              classId: assignment.classId,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        {
          message: "Không tìm thấy bài nộp của học sinh",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // 6. FIND SPEAKING RECORD
    // ==========================================

    const speakingRecord =
      await prisma.speakingRecord.findUnique({
        where: {
          submissionId_questionId: {
            submissionId,
            questionId: body.questionId,
          },
        },
        select: {
          id: true,
          grammarScore: true,
          vocabularyScore: true,
        },
      });

    if (!speakingRecord) {
      return NextResponse.json(
        {
          message:
            "Không tìm thấy bản ghi Speaking của câu hỏi",
        },
        { status: 404 }
      );
    }

    if (
      !validScore(speakingRecord.grammarScore) ||
      !validScore(speakingRecord.vocabularyScore)
    ) {
      return NextResponse.json(
        {
          message:
            "AI chưa chấm đủ Ngữ pháp và Từ vựng. Vui lòng chấm AI trước.",
        },
        { status: 409 }
      );
    }

    // ==========================================
    // 7. SAVE TEACHER SCORES
    // ==========================================

    const result = await prisma.$transaction(
      async (tx) => {
        // Đọc lại dữ liệu bên trong transaction
        const record =
          await tx.speakingRecord.findUnique({
            where: {
              submissionId_questionId: {
                submissionId,
                questionId: body.questionId,
              },
            },
          });

        if (!record) {
          throw new Error(
            "Bản ghi Speaking không còn tồn tại"
          );
        }

        if (
          !validScore(record.grammarScore) ||
          !validScore(record.vocabularyScore)
        ) {
          throw new Error(
            "AI chưa chấm đủ Ngữ pháp và Từ vựng"
          );
        }

        const questionScore = round2(
          (
            body.pronunciationScore +
            body.fluencyScore +
            record.grammarScore +
            record.vocabularyScore
          ) / 4
        );

        const teacherFeedback =
          body.feedback?.trim() ?? "";

        // Lưu riêng điểm giáo viên
        await tx.speakingRecord.update({
          where: {
            id: record.id,
          },
          data: {
            teacherPronunciationScore:
              body.pronunciationScore,
            teacherFluencyScore:
              body.fluencyScore,
            teacherFeedback,
            teacherGradedAt: new Date(),
            teacherGradedById: teacherId,
          },
        });

        // Giữ nguyên AI feedback trong SpeakingRecord
        // Answer.feedback lưu riêng nhận xét giáo viên
        const answerFeedback = JSON.stringify({
          assessmentType: "AI_TEACHER_COMBINED",
          aiFeedback: record.feedback,
          teacherFeedback,
        });

        const existingAnswers =
          await tx.answer.findMany({
            where: {
              submissionId,
              questionId: body.questionId,
            },
            select: {
              id: true,
            },
          });

        if (existingAnswers.length > 0) {
          await tx.answer.updateMany({
            where: {
              submissionId,
              questionId: body.questionId,
            },
            data: {
              score: questionScore,
              feedback: answerFeedback,
            },
          });
        } else {
          await tx.answer.create({
            data: {
              submissionId,
              questionId: body.questionId,
              answer: record.transcript ?? "",
              score: questionScore,
              feedback: answerFeedback,
            },
          });
        }

        // ======================================
        // 8. CHECK ALL SPEAKING QUESTIONS
        // ======================================

        const allRecords =
          await tx.speakingRecord.findMany({
            where: {
              submissionId,
              questionId: {
                in: questions.map(
                  (question) => question.id
                ),
              },
            },
            select: {
              questionId: true,
              grammarScore: true,
              vocabularyScore: true,
              teacherPronunciationScore: true,
              teacherFluencyScore: true,
              teacherGradedAt: true,
            },
          });

        const allCompleted =
          questions.length > 0 &&
          allRecords.length === questions.length &&
          allRecords.every(
            (item) =>
              validScore(item.grammarScore) &&
              validScore(item.vocabularyScore) &&
              validScore(
                item.teacherPronunciationScore
              ) &&
              validScore(item.teacherFluencyScore) &&
              item.teacherGradedAt !== null
          );

        let submissionScore: number | null = null;

        if (allCompleted) {
          const total = allRecords.reduce(
            (sum, item) => {
              const score =
                (
                  item.grammarScore! +
                  item.vocabularyScore! +
                  item.teacherPronunciationScore! +
                  item.teacherFluencyScore!
                ) / 4;

              return sum + score;
            },
            0
          );

          submissionScore = round2(
            total / allRecords.length
          );
        }

        // Chưa chấm đủ thì giữ score = null
        await tx.submission.update({
          where: {
            id: submissionId,
          },
          data: {
            score: submissionScore,
          },
        });

        return {
          questionScore,
          submissionScore,
          gradingStatus: allCompleted
            ? "COMPLETED"
            : "WAITING_TEACHER",
          completedQuestions: allRecords.filter(
            (item) =>
              validScore(item.grammarScore) &&
              validScore(item.vocabularyScore) &&
              validScore(
                item.teacherPronunciationScore
              ) &&
              validScore(item.teacherFluencyScore)
          ).length,
          totalQuestions: questions.length,
        };
      },
      {
        timeout: 30000,
      }
    );

    // ==========================================
    // 9. RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,
      message:
        result.gradingStatus === "COMPLETED"
          ? "Đã hoàn thành chấm bài Speaking"
          : "Đã lưu điểm câu Speaking",
      submissionId,
      questionId: body.questionId,
      questionScore: result.questionScore,
      score: result.submissionScore,
      gradingStatus: result.gradingStatus,
      completedQuestions: result.completedQuestions,
      totalQuestions: result.totalQuestions,
    });
  } catch (error) {
    console.error(
      "TEACHER SPEAKING GRADE ERROR:",
      error
    );

    return NextResponse.json(
      {
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
