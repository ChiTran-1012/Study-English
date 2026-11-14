
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { prisma } from "@/app/lib/prisma";
import { openai } from "@/app/lib/open-ai";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function GET(request: NextRequest) {
  try {
    // 1. Kiểm tra đăng nhập
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

    // 2. Xác thực quyền học sinh
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

    // 3. Lấy sessionId từ URL
    const sessionId = request.nextUrl.searchParams.get(
      "sessionId"
    );

    if (
      !sessionId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sessionId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Mã bài luyện tập không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // 4. Lấy bài Listening của học sinh
    const session =
      await prisma.practiceSession.findFirst({
        where: {
          id: sessionId,
          studentId,
          skill: "LISTENING",
        },
        select: {
          exercise: true,
        },
      });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Không tìm thấy bài Listening.",
        },
        { status: 404 }
      );
    }

    // 5. Lấy transcript từ dữ liệu đã lưu
    const exercise: unknown = session.exercise;

    if (!isObject(exercise)) {
      return NextResponse.json(
        {
          success: false,
          error: "Dữ liệu bài Listening không hợp lệ.",
        },
        { status: 500 }
      );
    }

    const transcript = exercise.transcript;

    if (
      typeof transcript !== "string" ||
      !transcript.trim() ||
      transcript.length > 5000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Không tìm thấy nội dung bài nghe hợp lệ.",
        },
        { status: 500 }
      );
    }

    // 6. Tạo giọng đọc tiếng Anh
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: transcript,
      response_format: "mp3",
      speed: 0.9,
    });

    // 7. Chuyển audio thành dữ liệu nhị phân
    const audioBuffer = await speech.arrayBuffer();

    // 8. Trả MP3 cho trình duyệt
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(
          audioBuffer.byteLength
        ),
        "Cache-Control": "private, no-store",
        "Content-Disposition":
          'inline; filename="listening.mp3"',
      },
    });
  } catch (error) {
    console.error(
      "STUDENT LISTENING AUDIO ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Không thể tạo audio Listening.",
      },
      { status: 500 }
    );
  }
}
