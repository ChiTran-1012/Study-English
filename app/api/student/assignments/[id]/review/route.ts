
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    // 1. Kiểm tra đăng nhập
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    let studentId: string;

    try {
      const { payload } = await jwtVerify(token, secret);

      if (
        payload.role !== "STUDENT" ||
        typeof payload.id !== "string"
      ) {
        return NextResponse.json(
          { error: "Không có quyền truy cập" },
          { status: 403 }
        );
      }

      studentId = payload.id;
    } catch {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    const { id: assignmentId } = await context.params;

    // 2. Lấy thông tin Assignment
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        class: {
          members: {
            some: { studentId },
          },
        },
      },
      include: {
        exercise: {
          include: {
            questions: {
              orderBy: { order: "asc" },
              include: {
                options: {
                  orderBy: { label: "asc" },
                },
              },
            },
          },
        },

        class: {
          select: {
            id: true,
            name: true,
            code: true,
            grade: true,
          },
        },

        teacher: {
          select: {
            id: true,
            name: true,
          },
        },

        submissions: {
          where: { studentId },
          take: 1,
          include: {
            answers: true,

            // Chỉ lấy metadata Speaking.
            // Không trả audioData trong JSON.
            speakingRecords: {
              select: {
                id: true,
                questionId: true,
                mimeType: true,
                transcript: true,
                pronunciationScore: true,
                fluencyScore: true,
                grammarScore: true,
                vocabularyScore: true,
                feedback: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy bài tập" },
        { status: 404 }
      );
    }

    const submission = assignment.submissions[0];

    if (!submission?.submittedAt) {
      return NextResponse.json(
        {
          error: "Bạn chưa nộp bài nên không thể xem lại",
        },
        { status: 403 }
      );
    }

    // 3. Tạo Map tra cứu câu trả lời
    const answerByQuestionId = new Map(
      submission.answers.map((answer) => [
        answer.questionId,
        answer,
      ])
    );

    const speakingByQuestionId = new Map(
      submission.speakingRecords.map((record) => [
        record.questionId,
        record,
      ])
    );

    // 4. Trả dữ liệu Review
    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        startAt: assignment.startAt,
        dueAt: assignment.dueAt,
      },

      exercise: {
        id: assignment.exercise.id,
        title: assignment.exercise.title,
        description: assignment.exercise.description,
        content: assignment.exercise.content,
        skill: assignment.exercise.skill,
        difficulty: assignment.exercise.difficulty,
        audioUrl: assignment.exercise.audioUrl,
      },

      class: assignment.class,
      teacher: assignment.teacher,

      submission: {
        id: submission.id,
        score: submission.score,
        submittedAt: submission.submittedAt,
      },

      questions: assignment.exercise.questions.map((question) => {
        const saved = answerByQuestionId.get(question.id);

        const speaking = speakingByQuestionId.get(question.id);

        return {
          id: question.id,
          content: question.content,
          type: question.type,
          order: question.order,
          explanation: question.explanation,
          correctAnswer: question.correctAnswer,

          studentAnswer:
            saved?.answer ??
            speaking?.transcript ??
            null,

          isCorrect: saved?.isCorrect ?? null,
          earnedScore: saved?.score ?? null,
          feedback: saved?.feedback ?? null,

          options: question.options.map((option) => ({
            id: option.id,
            label: option.label,
            content: option.content,
            isCorrect: option.isCorrect,
          })),

          // Dữ liệu riêng cho Speaking
          speaking: speaking
            ? {
                recordId: speaking.id,
                transcript: speaking.transcript,
                mimeType: speaking.mimeType,

                audioUrl:
                  `/api/student/assignments/${encodeURIComponent(
                    assignmentId
                  )}/speaking/audio/${encodeURIComponent(
                    speaking.id
                  )}`,

                pronunciationScore:
                  speaking.pronunciationScore,

                fluencyScore:
                  speaking.fluencyScore,

                grammarScore:
                  speaking.grammarScore,

                vocabularyScore:
                  speaking.vocabularyScore,

                feedback: speaking.feedback,
                createdAt: speaking.createdAt,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("GET ASSIGNMENT REVIEW ERROR:", error);

    return NextResponse.json(
      { error: "Lỗi server khi xem lại bài" },
      { status: 500 }
    );
  }
}
