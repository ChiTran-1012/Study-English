import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import OpenAI from "openai";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-key");
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map([
  ["audio/webm", "webm"],
  ["audio/mp4", "mp4"],
  ["audio/ogg", "ogg"],
  ["audio/mpeg", "mp3"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
]);

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    let studentId: string;
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== "STUDENT" || typeof payload.id !== "string") {
        return NextResponse.json({ error: "Chỉ học sinh được sử dụng API này." }, { status: 403 });
      }
      studentId = payload.id;
    } catch {
      return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    }

    const { id: assignmentId } = await context.params;
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        classId: true,
        startAt: true,
        dueAt: true,
        exercise: { select: { skill: true, questions: { select: { id: true } } } },
      },
    });
    if (!assignment || assignment.exercise.skill !== "SPEAKING") {
      return NextResponse.json({ error: "Không tìm thấy bài Speaking." }, { status: 404 });
    }
    const member = await prisma.classMember.findFirst({
      where: { classId: assignment.classId, studentId },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Bạn không thuộc lớp được giao bài." }, { status: 403 });
    const now = new Date();
    if (now < assignment.startAt || (assignment.dueAt && now > assignment.dueAt)) {
      return NextResponse.json({ error: "Bài tập chưa mở hoặc đã hết hạn." }, { status: 403 });
    }
    const submitted = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      select: { submittedAt: true },
    });
    if (submitted?.submittedAt) {
      return NextResponse.json({ error: "Bài tập đã được nộp." }, { status: 409 });
    }

    const form = await request.formData();
    const questionId = form.get("questionId");
    const audio = form.get("audio");
    if (typeof questionId !== "string" || !assignment.exercise.questions.some(q => q.id === questionId)) {
      return NextResponse.json({ error: "Câu hỏi không hợp lệ." }, { status: 400 });
    }
    if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_BYTES) {
      return NextResponse.json({ error: "File âm thanh phải có dung lượng từ 1 byte đến 10 MB." }, { status: 400 });
    }
    const mime = audio.type.split(";")[0].toLowerCase();
    const extension = ALLOWED.get(mime);
    if (!extension) return NextResponse.json({ error: "Định dạng âm thanh không hỗ trợ." }, { status: 415 });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Máy chủ chưa cấu hình OpenAI API key." }, { status: 503 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const upload = new File([await audio.arrayBuffer()], `speaking.${extension}`, { type: mime });
    const result = await client.audio.transcriptions.create({
      file: upload,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
      language: "en",
    });
    const transcript = result.text?.trim();
    if (!transcript) return NextResponse.json({ error: "Không nhận diện được lời nói. Hãy ghi âm lại." }, { status: 422 });
    return NextResponse.json({ success: true, questionId, transcript });
  } catch (error) {
    console.error("SPEAKING TRANSCRIBE ERROR:", error);
    return NextResponse.json({ error: "Không thể xử lý bản ghi âm. Vui lòng thử lại." }, { status: 500 });
  }
}
