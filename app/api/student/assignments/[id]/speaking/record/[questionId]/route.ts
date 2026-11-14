
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{
    id: string;
    questionId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    // 1. Xác thực Student
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập." },
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
          { message: "Không có quyền truy cập." },
          { status: 403 }
        );
      }

      studentId = payload.id;
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    const { id: assignmentId, questionId } =
      await context.params;

    // 2. Tìm bài nộp của chính học sinh
    const submission = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      select: {
        id: true,
        assignment: {
          select: {
            exercise: {
              select: {
                skill: true,
              },
            },
          },
        },
      },
    });

    if (
      !submission ||
      submission.assignment.exercise.skill !== "SPEAKING"
    ) {
      return NextResponse.json(
        { message: "Không tìm thấy bài Speaking." },
        { status: 404 }
      );
    }

    // 3. Tìm bản ghi âm thuộc bài nộp
    const record = await prisma.speakingRecord.findUnique({
      where: {
        submissionId_questionId: {
          submissionId: submission.id,
          questionId,
        },
      },
      select: {
        audioData: true,
        mimeType: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { message: "Chưa có bản ghi âm cho câu hỏi này." },
        { status: 404 }
      );
    }

    // 4. Trả audio về trình duyệt
    const audio = new Uint8Array(record.audioData);

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(audio.byteLength),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET SPEAKING AUDIO ERROR:", error);

    return NextResponse.json(
      { message: "Không thể tải bản ghi âm." },
      { status: 500 }
    );
  }
}
