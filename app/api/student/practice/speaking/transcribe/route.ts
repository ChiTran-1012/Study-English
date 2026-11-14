
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { toFile } from "openai";

import { prisma } from "@/app/lib/prisma";
import { openai } from "@/app/lib/open-ai";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

const MAX_AUDIO_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4;codecs=mp4a.40.2",
]);

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra cookie đăng nhập
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    // 2. Xác thực quyền STUDENT
    let studentId: string;

    try {
      const { payload } = await jwtVerify(
        token,
        secret
      );

      if (
        payload.role !== "STUDENT" ||
        typeof payload.id !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Bạn không có quyền truy cập.",
          },
          { status: 403 }
        );
      }

      studentId = payload.id;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // 3. Kiểm tra kích thước request
    const contentLength = request.headers.get(
      "content-length"
    );

    if (
      contentLength &&
      Number(contentLength) > MAX_AUDIO_SIZE + 1024 * 1024
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "File ghi âm quá lớn.",
        },
        { status: 413 }
      );
    }

    // 4. Đọc FormData
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Dữ liệu ghi âm không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const sessionId = formData.get("sessionId");
    const questionId = formData.get("questionId");
    const audio = formData.get("audio");

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
      typeof sessionId !== "string" ||
      !uuidRegex.test(sessionId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Mã bài luyện tập không hợp lệ.",
        },
        { status: 400 }
      );
    }

    if (
      typeof questionId !== "string" ||
      !/^[1-9]\d*$/.test(questionId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Mã câu hỏi không hợp lệ.",
        },
        { status: 400 }
      );
    }

    if (!(audio instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Chưa có file ghi âm.",
        },
        { status: 400 }
      );
    }

    // 5. Kiểm tra file audio
    if (
      audio.size === 0 ||
      audio.size > MAX_AUDIO_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "File ghi âm phải có dung lượng tối đa 10 MB.",
        },
        { status: 400 }
      );
    }

    const mimeType = audio.type
      .toLowerCase()
      .split(";")[0];

    if (
      !ALLOWED_MIME_TYPES.has(audio.type.toLowerCase()) &&
      !ALLOWED_MIME_TYPES.has(mimeType)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Định dạng audio không được hỗ trợ.",
        },
        { status: 400 }
      );
    }

    // 6. Kiểm tra bài Speaking thuộc học sinh
    const session =
      await prisma.practiceSession.findFirst({
        where: {
          id: sessionId,
          studentId,
          skill: "SPEAKING",
        },
        select: {
          exercise: true,
          submittedAt: true,
        },
      });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Không tìm thấy bài Speaking.",
        },
        { status: 404 }
      );
    }

    if (session.submittedAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Bài Speaking đã được nộp.",
        },
        { status: 409 }
      );
    }

    // 7. Kiểm tra questionId
    const exercise: unknown = session.exercise;

    if (
      !isObject(exercise) ||
      !Array.isArray(exercise.questions)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Dữ liệu bài Speaking không hợp lệ.",
        },
        { status: 500 }
      );
    }

    const questionIndex = Number(questionId) - 1;

    if (
      questionIndex < 0 ||
      questionIndex >= exercise.questions.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Không tìm thấy câu hỏi.",
        },
        { status: 404 }
      );
    }

    // 8. Chuyển audio thành dữ liệu gửi OpenAI
    const buffer = Buffer.from(
      await audio.arrayBuffer()
    );

    const extension =
      mimeType === "audio/webm"
        ? "webm"
        : mimeType === "audio/ogg"
        ? "ogg"
        : mimeType === "audio/wav" ||
          mimeType === "audio/x-wav"
        ? "wav"
        : mimeType === "audio/mpeg" ||
          mimeType === "audio/mp3"
        ? "mp3"
        : "mp4";

    const audioFile = await toFile(
      buffer,
      `speaking-${questionId}.${extension}`,
      { type: mimeType }
    );

    // 9. Gọi OpenAI Speech-to-Text
    const transcription =
      await openai.audio.transcriptions.create({
        model: "gpt-4o-mini-transcribe",
        file: audioFile,
        language: "en",
      });

    const transcript = transcription.text?.trim();

    if (!transcript) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Không nhận diện được giọng nói. Vui lòng ghi âm lại.",
        },
        { status: 422 }
      );
    }

    // 10. Trả kết quả nhận diện giọng nói
    return NextResponse.json({
      success: true,
      sessionId,
      questionId,
      transcript,
      message:
        "Chuyển giọng nói thành văn bản thành công.",
    });
  } catch (error) {
    console.error(
      "SPEAKING TRANSCRIBE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Không thể xử lý file ghi âm. Vui lòng thử lại.",
      },
      { status: 500 }
    );
  }
}
