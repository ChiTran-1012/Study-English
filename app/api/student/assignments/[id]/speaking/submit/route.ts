
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{ id: string }>;
};

function fail(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function POST(
  request: NextRequest,
  { params }: Context
) {
  try {
    // 1. Xác thực học sinh
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
        return fail("Không có quyền nộp bài.", 403);
      }

      studentId = payload.id;
    } catch {
      return fail("Phiên đăng nhập không hợp lệ.", 401);
    }

    const { id: assignmentId } = await params;

    // 2. Kiểm tra assignment và quyền học sinh
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
              select: {
                id: true,
                type: true,
              },
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

    const now = new Date();

    if (now < assignment.startAt) {
      return fail("Bài tập chưa mở.", 403);
    }

    if (assignment.dueAt && now > assignment.dueAt) {
      return fail("Bài tập đã hết hạn.", 403);
    }

    const questions = assignment.exercise.questions;

    if (questions.length === 0) {
      return fail("Bài Speaking chưa có câu hỏi.", 400);
    }

    if (questions.some((q) => q.type !== "SPEAKING")) {
      return fail(
        "Bài Speaking chứa loại câu hỏi không hợp lệ.",
        400
      );
    }

    // 3. Lấy bản nháp đã lưu
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
          },
        },
      },
    });

    if (!submission) {
      return fail(
        "Chưa có bản ghi âm. Hãy lưu audio trước khi nộp.",
        400
      );
    }

    if (submission.submittedAt) {
      return fail("Bạn đã nộp bài này rồi.", 409);
    }

    const recordMap = new Map(
      submission.speakingRecords.map((record) => [
        record.questionId,
        record,
      ])
    );

    // 4. Kiểm tra từng câu Speaking
    for (const question of questions) {
      const record = recordMap.get(question.id);

      if (!record) {
        return fail(
          "Bạn chưa lưu bản ghi âm cho tất cả câu hỏi.",
          400
        );
      }

      if (!record.transcript?.trim()) {
        return fail(
          "Bạn chưa lưu transcript cho tất cả câu hỏi.",
          400
        );
      }
    }

    // 5. Nộp bài bằng transaction
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Chỉ một yêu cầu được chuyển từ nháp sang đã nộp.
          const updated = await tx.submission.updateMany({
            where: {
              id: submission.id,
              submittedAt: null,
            },
            data: {
              submittedAt: new Date(),
              score: null,
            },
          });

          if (updated.count !== 1) {
            throw new Error("ALREADY_SUBMITTED");
          }

          // Đọc lại transcript trong transaction.
          const records = await tx.speakingRecord.findMany({
            where: {
              submissionId: submission.id,
              questionId: {
                in: questions.map((q) => q.id),
              },
            },
            select: {
              questionId: true,
              transcript: true,
            },
          });

          const currentMap = new Map(
            records.map((r) => [r.questionId, r.transcript])
          );

          const missing = questions.some(
            (q) => !currentMap.get(q.id)?.trim()
          );

          if (missing) {
            throw new Error("INCOMPLETE_RECORDS");
          }

          // Lưu transcript vào Answer để phục vụ Review.
          await tx.answer.deleteMany({
            where: {
              submissionId: submission.id,
            },
          });

          await tx.answer.createMany({
            data: questions.map((question) => ({
              submissionId: submission.id,
              questionId: question.id,
              answer: currentMap.get(question.id)!.trim(),
              isCorrect: null,
              score: null,
              feedback: null,
            })),
          });

          return {
            submissionId: submission.id,
            totalQuestions: questions.length,
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      return NextResponse.json({
        success: true,
        message: "Nộp bài Speaking thành công.",
        ...result,
        score: null,
        gradingStatus: "PENDING",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "ALREADY_SUBMITTED"
      ) {
        return fail("Bạn đã nộp bài này rồi.", 409);
      }

      if (
        error instanceof Error &&
        error.message === "INCOMPLETE_RECORDS"
      ) {
        return fail(
          "Dữ liệu Speaking chưa đầy đủ. Vui lòng kiểm tra lại.",
          409
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code)
      ) {
        return fail(
          "Có yêu cầu nộp bài đồng thời. Hãy thử lại.",
          409
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("SPEAKING SUBMIT ERROR:", error);

    return fail("Không thể nộp bài Speaking.", 500);
  }
}
