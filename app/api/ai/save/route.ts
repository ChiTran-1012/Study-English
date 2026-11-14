import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";
import {
  getReadingRules,
  validateReadingExercise,
  QUESTION_TYPES,
  type QuestionType,
} from "@/app/lib/ai-reading-validator";

export const runtime = "nodejs";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-key");
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";
type SaveQuestion = {
  type: QuestionType;
  content: string;
  correctAnswer: string | null;
  explanation: string | null;
  options: { label: string; content: string; isCorrect: boolean }[];
};
function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function str(v: unknown): string { return typeof v === "string" ? v.trim() : ""; }

function validateListening(raw: Record<string, unknown>): { errors: string[]; questions: SaveQuestion[] } {
  const errors: string[] = [];
  const questions: SaveQuestion[] = [];
  if (!str(raw.title) || str(raw.title).length > 200) errors.push("Tiêu đề Listening không hợp lệ.");
  if (!str(raw.transcript) || str(raw.transcript).length > 12000) errors.push("Transcript không hợp lệ.");
  if (!/^\/audio\/listening\/[a-zA-Z0-9_-]+\.mp3$/.test(str(raw.audioUrl))) {
    errors.push("audioUrl phải thuộc /audio/listening/ và là MP3.");
  }
  if (!Array.isArray(raw.questions) || raw.questions.length < 1 || raw.questions.length > 10) {
    return { errors: [...errors, "Listening phải có 1–10 câu hỏi."], questions };
  }
  raw.questions.forEach((q: unknown, i: number) => {
    if (!isRecord(q)) { errors.push(`Câu ${i + 1} không hợp lệ.`); return; }
    const type = q.type;
    const content = str(q.content);
    const correctAnswer = str(q.correctAnswer);
    const explanation = str(q.explanation);
    if (!["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK"].includes(String(type)) || !content || content.length > 2000 || !correctAnswer) {
      errors.push(`Câu ${i + 1}: dạng câu hỏi, nội dung hoặc đáp án không hợp lệ.`); return;
    }
    if (!Array.isArray(q.options)) { errors.push(`Câu ${i + 1}: options phải là mảng.`); return; }
    const options: SaveQuestion["options"] = [];
    for (const o of q.options) {
      if (!isRecord(o) || !str(o.label) || !str(o.content) || typeof o.isCorrect !== "boolean") {
        errors.push(`Câu ${i + 1}: lựa chọn không hợp lệ.`); continue;
      }
      options.push({ label: str(o.label).toUpperCase(), content: str(o.content), isCorrect: o.isCorrect });
    }
    if (type === "MULTIPLE_CHOICE") {
      const labels = options.map(o => o.label);
      if (options.length !== 4 || new Set(labels).size !== 4 || !["A", "B", "C", "D"].every(l => labels.includes(l)) || options.filter(o => o.isCorrect).length !== 1 || options.find(o => o.isCorrect)?.label !== correctAnswer.toUpperCase()) {
        errors.push(`Câu ${i + 1}: trắc nghiệm cần 4 lựa chọn A–D, một đáp án đúng khớp correctAnswer.`);
      }
    } else if (type === "TRUE_FALSE") {
      if (options.length !== 0 || !["TRUE", "FALSE"].includes(correctAnswer.toUpperCase())) errors.push(`Câu ${i + 1}: TRUE_FALSE cần options rỗng và đáp án TRUE/FALSE.`);
    } else if (options.length !== 0 || !content.includes("_____")) {
      errors.push(`Câu ${i + 1}: FILL_BLANK cần options rỗng và có _____.`);
    }
    questions.push({ type: type as QuestionType, content, correctAnswer: type === "FILL_BLANK" ? correctAnswer : correctAnswer.toUpperCase(), explanation: explanation || null, options });
  });
  return { errors, questions };
}

function validateWriting(raw: Record<string, unknown>): { errors: string[]; questions: SaveQuestion[] } {
  const errors: string[] = [];
  const questions: SaveQuestion[] = [];
  if (!str(raw.title) || str(raw.title).length > 200) errors.push("Tiêu đề Writing phải từ 1–200 ký tự.");
  if (!Array.isArray(raw.questions) || raw.questions.length < 1 || raw.questions.length > 5) {
    return { errors: [...errors, "Writing phải có 1–5 đề viết."], questions };
  }
  raw.questions.forEach((q: unknown, i: number) => {
    if (!isRecord(q) || q.type !== "WRITING" || !str(q.content) || str(q.content).length > 2000) {
      errors.push(`Câu ${i + 1}: phải là WRITING với nội dung 1–2000 ký tự.`); return;
    }
    if (q.options !== undefined && (!Array.isArray(q.options) || q.options.length !== 0)) {
      errors.push(`Câu ${i + 1}: Writing không có options.`); return;
    }
    questions.push({ type: "WRITING" as QuestionType, content: str(q.content), correctAnswer: null, explanation: null, options: [] });
  });
  return { errors, questions };
}


function validateSpeaking(raw: Record<string, unknown>): { errors: string[]; questions: SaveQuestion[] } {
  const errors: string[] = [];
  const questions: SaveQuestion[] = [];
  if (!str(raw.title) || str(raw.title).length > 200) errors.push("Tiêu đề Speaking phải từ 1–200 ký tự.");
  if (str(raw.description).length > 1000) errors.push("Mô tả Speaking quá dài.");
  if (!Array.isArray(raw.questions) || raw.questions.length < 1 || raw.questions.length > 5) {
    return { errors: [...errors, "Speaking phải có 1–5 câu hỏi."], questions };
  }
  raw.questions.forEach((q: unknown, i: number) => {
    if (!isRecord(q) || q.type !== "SPEAKING" || !str(q.content) || str(q.content).length > 2000) {
      errors.push(`Câu ${i + 1}: phải có type SPEAKING và nội dung từ 1–2000 ký tự.`);
      return;
    }
    if (q.options !== undefined && (!Array.isArray(q.options) || q.options.length !== 0)) {
      errors.push(`Câu ${i + 1}: Speaking không có options.`);
      return;
    }
    if (q.correctAnswer != null && str(q.correctAnswer)) {
      errors.push(`Câu ${i + 1}: Speaking không có đáp án cố định.`);
      return;
    }
    questions.push({
      type: "SPEAKING" as QuestionType,
      content: str(q.content),
      correctAnswer: null,
      explanation: str(q.explanation) || null,
      options: [],
    });
  });
  return { errors, questions };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    let teacherId: string;
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== "TEACHER" || typeof payload.id !== "string" || !payload.id) {
        return NextResponse.json({ error: "Không có quyền lưu bài tập." }, { status: 403 });
      }
      teacherId = payload.id;
    } catch {
      return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    }
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 }); }
    if (!isRecord(body) || !isRecord(body.exercise)) return NextResponse.json({ error: "Thiếu bài tập." }, { status: 400 });
    const { grade, difficulty } = body;
    const raw = body.exercise;
    if (typeof grade !== "number" || !Number.isInteger(grade) || grade < 1 || grade > 9) {
      return NextResponse.json({ error: "Khối lớp không hợp lệ." }, { status: 400 });
    }
    if (difficulty !== "EASY" && difficulty !== "MEDIUM" && difficulty !== "HARD") {
      return NextResponse.json({ error: "Độ khó không hợp lệ." }, { status: 400 });
    }
    const skill: Skill | null = raw.skill === "LISTENING" ? "LISTENING" : raw.skill === "WRITING" ? "WRITING" : raw.skill === "SPEAKING" ? "SPEAKING" : raw.skill === "READING" || raw.skill === undefined ? "READING" : null;
    if (!skill) return NextResponse.json({ error: "Kỹ năng không được hỗ trợ." }, { status: 400 });
    const count = Array.isArray(raw.questions) ? raw.questions.length : 0;
    if (count < 1 || count > 10) return NextResponse.json({ error: "Số câu hỏi không hợp lệ." }, { status: 400 });
    let title = "";
    let description: string | null = null;
    let content: string | null = null;
    let audioUrl: string | null = null;
    let transcript: string | null = null;
    let questions: SaveQuestion[] = [];
    if (skill === "READING") {
      const checked = validateReadingExercise(raw, count, getReadingRules(grade), QUESTION_TYPES);
      if (!checked.valid || !checked.exercise) {
        return NextResponse.json({ error: "Bài Reading không hợp lệ.", validationErrors: checked.errors }, { status: 400 });
      }
      title = checked.exercise.title;
      description = checked.exercise.description || null;
      content = checked.exercise.content;
      questions = checked.exercise.questions.map(q => ({
        type: q.type as QuestionType, content: q.content, correctAnswer: q.correctAnswer,
        explanation: q.explanation, options: q.options.map(o => ({ label: o.label, content: o.content, isCorrect: o.isCorrect })),
      }));
    } else if (skill === "LISTENING") {
      const checked = validateListening(raw);
      if (checked.errors.length) return NextResponse.json({ error: "Bài Listening không hợp lệ.", validationErrors: checked.errors }, { status: 400 });
      title = str(raw.title); description = str(raw.description) || null;
      audioUrl = str(raw.audioUrl); transcript = str(raw.transcript); questions = checked.questions;
    } else if (skill === "SPEAKING") {
      const checked = validateSpeaking(raw);
      if (checked.errors.length) return NextResponse.json({ error: "Bài Speaking không hợp lệ.", validationErrors: checked.errors }, { status: 400 });
      title = str(raw.title); description = str(raw.description) || null;
      questions = checked.questions;
    } else {
      const checked = validateWriting(raw);
      if (checked.errors.length) return NextResponse.json({ error: "Bài Writing không hợp lệ.", validationErrors: checked.errors }, { status: 400 });
      title = str(raw.title); description = str(raw.description) || null;
      questions = checked.questions;
    }
    const saved = await prisma.exercise.create({
      data: {
        title, description, content, audioUrl, transcript, skill,
        difficulty: difficulty as Difficulty, source: "AI", teacherId,
        questions: { create: questions.map((q, index) => ({
          type: q.type, content: q.content, correctAnswer: q.correctAnswer,
          explanation: q.explanation, order: index + 1,
          options: { create: q.options.map(o => ({ label: o.label, content: o.content, isCorrect: o.isCorrect })) },
        })) },
      },
      select: { id: true, title: true, _count: { select: { questions: true } } },
    });
    return NextResponse.json({ success: true, exerciseId: saved.id, title: saved.title, skill, questionCount: saved._count.questions }, { status: 201 });
  } catch (error) {
    console.error("SAVE AI EXERCISE ERROR:", error);
    return NextResponse.json({ error: "Không thể lưu bài tập AI." }, { status: 500 });
  }
}
