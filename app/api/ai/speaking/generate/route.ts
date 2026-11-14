import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import OpenAI from "openai";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type SpeakingQuestion = {
  type: "SPEAKING";
  content: string;
  correctAnswer: null;
  explanation: string;
  options: [];
};

type SpeakingExercise = {
  title: string;
  description: string;
  skill: "SPEAKING";
  difficulty: Difficulty;
  questions: SpeakingQuestion[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateExercise(
  raw: unknown,
  count: number,
  difficulty: Difficulty
): SpeakingExercise {
  if (!isRecord(raw)) throw new Error("AI trả về bài tập không hợp lệ.");
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (!title || title.length > 200 || description.length > 1000) {
    throw new Error("Tiêu đề hoặc mô tả không hợp lệ.");
  }
  if (!Array.isArray(raw.questions) || raw.questions.length !== count) {
    throw new Error(`AI phải tạo đúng ${count} câu Speaking.`);
  }
  const questions: SpeakingQuestion[] = raw.questions.map((item: unknown, index: number) => {
    if (!isRecord(item)) throw new Error(`Câu ${index + 1} không hợp lệ.`);
    const content = typeof item.content === "string" ? item.content.trim() : "";
    const explanation = typeof item.explanation === "string" ? item.explanation.trim() : "";
    if (!content || content.length > 2000 || explanation.length > 1000) {
      throw new Error(`Nội dung câu ${index + 1} không hợp lệ.`);
    }
    return { type: "SPEAKING", content, explanation, correctAnswer: null, options: [] };
  });
  return { title, description, skill: "SPEAKING", difficulty, questions };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== "TEACHER" || typeof payload.id !== "string") {
        return NextResponse.json({ error: "Chỉ giáo viên được tạo đề." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    }

    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 }); }
    if (!isRecord(body)) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

    const { grade, topic, difficulty, questionCount } = body;
    if (typeof grade !== "number" || !Number.isInteger(grade) || grade < 1 || grade > 9) {
      return NextResponse.json({ error: "Khối lớp phải từ 1 đến 9." }, { status: 400 });
    }
    if (typeof topic !== "string" || !topic.trim() || topic.trim().length > 100) {
      return NextResponse.json({ error: "Chủ đề phải từ 1 đến 100 ký tự." }, { status: 400 });
    }
    if (difficulty !== "EASY" && difficulty !== "MEDIUM" && difficulty !== "HARD") {
      return NextResponse.json({ error: "Độ khó không hợp lệ." }, { status: 400 });
    }
    if (typeof questionCount !== "number" || !Number.isInteger(questionCount) || questionCount < 1 || questionCount > 5) {
      return NextResponse.json({ error: "Speaking hỗ trợ 1–5 câu hỏi." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Máy chủ chưa cấu hình OPENAI_API_KEY." }, { status: 503 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_SPEAKING_MODEL || "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You create safe, age-appropriate English SPEAKING prompts for Vietnamese grade 1–9 students. Return ONLY a JSON object with title (string), description (string), questions (array). Each question has content (English speaking instruction) and explanation (short Vietnamese teacher guidance). Do not provide model answers. No personally identifying information requests. Create exactly ${questionCount} distinct prompts, suited to grade ${grade}, difficulty ${difficulty}. For grade 1–2 use simple words and short sentences; grade 3–5 simple conversational prompts; grade 6–9 increasingly complex speaking tasks.`,
        },
        {
          role: "user",
          content: JSON.stringify({ grade, topic: topic.trim(), difficulty, questionCount }),
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("AI không trả nội dung.");
    let parsed: unknown;
    try { parsed = JSON.parse(content); }
    catch { throw new Error("AI trả JSON không hợp lệ."); }
    const exercise = validateExercise(parsed, questionCount, difficulty);
    return NextResponse.json({ success: true, exercise });
  } catch (error) {
    console.error("SPEAKING GENERATE ERROR:", error);
    return NextResponse.json({ error: "Không thể tạo đề Speaking. Vui lòng thử lại." }, { status: 502 });
  }
}
