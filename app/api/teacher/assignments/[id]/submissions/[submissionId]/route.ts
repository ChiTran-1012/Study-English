
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    id: string;
    submissionId: string;
  }>;
};

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

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

    const { id, submissionId } = await context.params;

    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        teacherId: payload.id,
        class: { teacherId: payload.id },
        exercise: { skill: "SPEAKING" },
      },
      select: {
        id: true,
        title: true,
        classId: true,
        exercise: {
          select: {
            title: true,
            questions: {
              where: { type: "SPEAKING" },
              orderBy: { order: "asc" },
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
        { message: "Không tìm thấy bài Speaking" },
        { status: 404 }
      );
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        assignmentId: id,
        submittedAt: { not: null },
        student: {
          classMembers: {
            some: { classId: assignment.classId },
          },
        },
      },
      select: {
        id: true,
        score: true,
        submittedAt: true,
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        speakingRecords: {
          select: {
            id: true,
            questionId: true,
            transcript: true,
            grammarScore: true,
            vocabularyScore: true,
            teacherPronunciationScore: true,
            teacherFluencyScore: true,
            teacherFeedback: true,
            teacherGradedAt: true,
            feedback: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { message: "Không tìm thấy bài nộp" },
        { status: 404 }
      );
    }

    const recordMap = new Map(
      submission.speakingRecords.map((record) => [
        record.questionId,
        record,
      ])
    );

    const questions = assignment.exercise.questions.map(
      (question) => {
        const record = recordMap.get(question.id);

        return {
          id: question.id,
          order: question.order,
          content: question.content,
          recordId: record?.id ?? null,
          audioUrl: record
            ? `/api/teacher/assignments/${encodeURIComponent(id)}/submissions/${encodeURIComponent(submissionId)}/audio/${encodeURIComponent(record.id)}`
            : null,
          transcript: record?.transcript ?? null,
          grammarScore: record?.grammarScore ?? null,
          vocabularyScore:
            record?.vocabularyScore ?? null,
          pronunciationScore:
            record?.teacherPronunciationScore ?? null,
          fluencyScore:
            record?.teacherFluencyScore ?? null,
          teacherFeedback:
            record?.teacherFeedback ?? "",
          teacherGradedAt:
            record?.teacherGradedAt ?? null,
          aiFeedback: record?.feedback ?? null,
        };
      }
    );

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title:
          assignment.title || assignment.exercise.title,
      },
      submission: {
        id: submission.id,
        score: submission.score,
        submittedAt: submission.submittedAt,
        student: submission.student,
      },
      questions,
    });
  } catch (error) {
    console.error("TEACHER SPEAKING DETAIL:", error);

    return NextResponse.json(
      { message: "Không thể tải chi tiết bài Speaking" },
      { status: 500 }
    );
  }
}
