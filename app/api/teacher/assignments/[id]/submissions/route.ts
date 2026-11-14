
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
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
        { message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        teacherId: payload.id,
        class: { teacherId: payload.id },
        exercise: { skill: "SPEAKING" },
      },
      select: {
        id: true,
        title: true,
        class: {
          select: { name: true },
        },
        exercise: {
          select: { title: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { message: "Không tìm thấy bài Speaking" },
        { status: 404 }
      );
    }

    const submissions = await prisma.submission.findMany({
      where: {
        assignmentId: id,
        submittedAt: { not: null },
        student: {
          classMembers: {
            some: { classId: (
              await prisma.assignment.findUniqueOrThrow({
                where: { id },
                select: { classId: true },
              })
            ).classId },
          },
        },
      },
      select: {
        id: true,
        score: true,
        submittedAt: true,
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        speakingRecords: {
          select: {
            id: true,
            grammarScore: true,
            vocabularyScore: true,
            teacherPronunciationScore: true,
            teacherFluencyScore: true,
            teacherGradedAt: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title || assignment.exercise.title,
        className: assignment.class.name,
      },
      submissions: submissions.map((item) => {
        const records = item.speakingRecords;

        const aiReady =
          records.length > 0 &&
          records.every(
            (record) =>
              record.grammarScore != null &&
              record.vocabularyScore != null
          );

        const teacherReady =
          records.length > 0 &&
          records.every(
            (record) =>
              record.teacherPronunciationScore != null &&
              record.teacherFluencyScore != null &&
              record.teacherGradedAt != null
          );

        return {
          id: item.id,
          student: item.student,
          submittedAt: item.submittedAt,
          score: item.score,
          aiReady,
          teacherReady,
          status: teacherReady && aiReady
            ? "COMPLETED"
            : !aiReady
              ? "WAITING_AI"
              : "WAITING_TEACHER",
        };
      }),
    });
  } catch (error) {
    console.error("TEACHER SUBMISSIONS:", error);

    return NextResponse.json(
      { message: "Không thể tải danh sách bài nộp" },
      { status: 500 }
    );
  }
}
