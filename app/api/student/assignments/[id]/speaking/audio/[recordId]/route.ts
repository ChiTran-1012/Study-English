
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
    recordId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: Context
) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
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
          { message: "Không có quyền truy cập" },
          { status: 403 }
        );
      }

      studentId = payload.id;
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    const { id: assignmentId, recordId } = await params;

    // Chỉ cho học sinh xem bản ghi của chính mình
    // thuộc bài đã nộp.
    const record = await prisma.speakingRecord.findFirst({
      where: {
        id: recordId,
        submission: {
          assignmentId,
          studentId,
          submittedAt: { not: null },
          assignment: {
            exercise: {
              skill: "SPEAKING",
            },
          },
        },
      },
      select: {
        audioData: true,
        mimeType: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { message: "Không tìm thấy bản ghi Speaking" },
        { status: 404 }
      );
    }

    // Audio lưu trong PostgreSQL dưới dạng Bytes.
    const audio = Buffer.from(record.audioData);

    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(audio.length),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Accept-Ranges": "none",
      },
    });
  } catch (error) {
    console.error("GET SPEAKING AUDIO ERROR:", error);

    return NextResponse.json(
      { message: "Không thể tải audio Speaking" },
      { status: 500 }
    );
  }
}
