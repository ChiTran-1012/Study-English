import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-key");
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav",
]);
type Context = { params: Promise<{ id: string }> };

function fail(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return fail("Chưa đăng nhập.", 401);

    let studentId: string;
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== "STUDENT" || typeof payload.id !== "string") {
        return fail("Bạn không có quyền thực hiện thao tác này.", 403);
      }
      studentId = payload.id;
    } catch {
      return fail("Phiên đăng nhập không hợp lệ.", 401);
    }

    const { id: assignmentId } = await params;
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        exercise: { include: { questions: { select: { id: true, type: true } } } },
      },
    });
    if (!assignment || assignment.exercise.skill !== "SPEAKING") {
      return fail("Không tìm thấy bài Speaking.", 404);
    }

    const member = await prisma.classMember.findFirst({
      where: { classId: assignment.classId, studentId },
      select: { id: true },
    });
    if (!member) return fail("Bạn không thuộc lớp được giao bài.", 403);

    const now = new Date();
    if (now < assignment.startAt || (assignment.dueAt && now > assignment.dueAt)) {
      return fail("Bài tập chưa mở hoặc đã hết hạn.", 403);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_AUDIO_BYTES + 1024 * 1024) {
      return fail("File quá lớn (tối đa 10 MB).", 413);
    }

    const form = await request.formData();
    const questionId = form.get("questionId");
    const audio = form.get("audio");
    if (typeof questionId !== "string" || !(audio instanceof File)) {
      return fail("Thiếu questionId hoặc file audio.", 400);
    }
    if (!assignment.exercise.questions.some(q => q.id === questionId && q.type === "SPEAKING")) {
      return fail("Câu hỏi không thuộc bài Speaking này.", 400);
    }
    const mimeType = audio.type.split(";")[0].toLowerCase();
    if (!ALLOWED_TYPES.has(mimeType)) return fail("Định dạng audio không được hỗ trợ.", 415);
    if (audio.size < 1000 || audio.size > MAX_AUDIO_BYTES) {
      return fail("Audio phải từ 1 KB đến 10 MB.", 400);
    }

    const existing = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      select: { id: true, submittedAt: true },
    });
    if (existing?.submittedAt) return fail("Bài này đã được nộp, không thể sửa bản ghi.", 409);

    const audioData = Buffer.from(await audio.arrayBuffer());
    // Transaction ensures the draft Submission and recording are written together.
    const record = await prisma.$transaction(async tx => {
      const submission = await tx.submission.upsert({
        where: { assignmentId_studentId: { assignmentId, studentId } },
        create: { assignmentId, studentId },
        update: {},
      });
      if (submission.submittedAt) throw new Error("ALREADY_SUBMITTED");
      return tx.speakingRecord.upsert({
        where: { submissionId_questionId: { submissionId: submission.id, questionId } },
        create: { submissionId: submission.id, questionId, audioData, mimeType },
        update: {
          audioData, mimeType, transcript: null,
          pronunciationScore: null, fluencyScore: null,
          grammarScore: null, vocabularyScore: null, feedback: null,
        },
        select: { id: true, questionId: true, createdAt: true },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu bản ghi Speaking vào PostgreSQL (bản nháp).",
      record,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_SUBMITTED") {
      return fail("Bài đã được nộp, không thể sửa bản ghi.", 409);
    }
    console.error("SAVE SPEAKING RECORD:", error);
    return fail("Không thể lưu bản ghi Speaking.", 500);
  }
}
