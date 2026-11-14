
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    id: string;
    submissionId: string;
    recordId: string;
  }>;
};

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, secret);

    if (
      payload.role !== "TEACHER" ||
      typeof payload.id !== "string"
    ) {
      return NextResponse.json(
        { message: "Không có quyền" },
        { status: 403 }
      );
    }

    const { id, submissionId, recordId } =
      await context.params;

    const record = await prisma.speakingRecord.findFirst({
      where: {
        id: recordId,
        submissionId,
        submission: {
          assignmentId: id,
          submittedAt: { not: null },
          assignment: {
            teacherId: payload.id,
            class: { teacherId: payload.id },
            exercise: { skill: "SPEAKING" },
          },
          student: {
            classMembers: {
              some: {
                class: {
                  assignments: {
                    some: {
                      id,
                      teacherId: payload.id,
                    },
                  },
                },
              },
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
        { message: "Không tìm thấy bản ghi âm" },
        { status: 404 }
      );
    }

    const audio = new Uint8Array(record.audioData);

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type":
          record.mimeType || "application/octet-stream",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("TEACHER SPEAKING AUDIO:", error);

    return NextResponse.json(
      { message: "Không thể phát bản ghi âm" },
      { status: 500 }
    );
  }
}
