
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

function fail(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function PATCH(
  request: NextRequest,
  { params }: Context
) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return fail("Chưa đăng nhập.", 401);
    }

    let studentId: string;

    try {
      const { payload } = await jwtVerify(token, secret);

      if (
        payload.role !== "STUDENT" ||
        typeof payload.id !== "string"
      ) {
        return fail("Không có quyền truy cập.", 403);
      }

      studentId = payload.id;
    } catch {
      return fail("Phiên đăng nhập không hợp lệ.", 401);
    }

    const { id: assignmentId } = await params;

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return fail("Dữ liệu JSON không hợp lệ.", 400);
    }

    const { questionId, transcript } = body;

    if (
      typeof questionId !== "string" ||
      !questionId.trim() ||
      typeof transcript !== "string" ||
      !transcript.trim()
    ) {
      return fail("Thiếu questionId hoặc transcript.", 400);
    }

    if (transcript.length > 10000) {
      return fail("Transcript quá dài.", 400);
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        exercise: {
          include: {
            questions: {
              select: { id: true, type: true },
            },
          },
        },
      },
    });

    if (
      !assignment ||
      assignment.exercise.skill !== "SPEAKING"
    ) {
      return fail("Không tìm thấy bài Speaking.", 404);
    }

    const member = await prisma.classMember.findFirst({
      where: {
        classId: assignment.classId,
        studentId,
      },
      select: { id: true },
    });

    if (!member) {
      return fail("Bạn không thuộc lớp được giao bài.", 403);
    }

    const now = new Date();

    if (
      now < assignment.startAt ||
      (assignment.dueAt && now > assignment.dueAt)
    ) {
      return fail("Bài tập chưa mở hoặc đã hết hạn.", 403);
    }

    const validQuestion = assignment.exercise.questions.some(
      (question) =>
        question.id === questionId &&
        question.type === "SPEAKING"
    );

    if (!validQuestion) {
      return fail("Câu hỏi Speaking không hợp lệ.", 400);
    }

    const submission = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      select: {
        id: true,
        submittedAt: true,
      },
    });

    if (!submission) {
      return fail(
        "Chưa có bản ghi âm. Hãy lưu audio trước.",
        404
      );
    }

    if (submission.submittedAt) {
      return fail(
        "Bài đã được nộp, không thể chỉnh sửa.",
        409
      );
    }

    // Chỉ cập nhật bản ghi thuộc submission của học sinh.
    // Điều kiện submittedAt được kiểm tra lại trong transaction.
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.submission.findUnique({
        where: { id: submission.id },
        select: { submittedAt: true },
      });

      if (!current || current.submittedAt) {
        throw new Error("ALREADY_SUBMITTED");
      }

      return tx.speakingRecord.update({
        where: {
          submissionId_questionId: {
            submissionId: submission.id,
            questionId,
          },
        },
        data: {
          transcript: transcript.trim(),
          pronunciationScore: null,
          fluencyScore: null,
          grammarScore: null,
          vocabularyScore: null,
          feedback: null,
        },
        select: {
          id: true,
          questionId: true,
          transcript: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu transcript Speaking.",
      record: result,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ALREADY_SUBMITTED"
    ) {
      return fail(
        "Bài đã được nộp, không thể chỉnh sửa.",
        409
      );
    }

    console.error("SAVE SPEAKING TRANSCRIPT:", error);

    return fail(
      "Không thể cập nhật transcript. Kiểm tra bản ghi âm đã tồn tại.",
      500
    );
  }
}
