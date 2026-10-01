import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // =========================
    // 1. Kiểm tra đăng nhập
    // =========================
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, secret);

    const teacherId = payload.id as string;
    const role = payload.role as string;

    if (!teacherId) {
      return NextResponse.json(
        { message: "Token không hợp lệ" },
        { status: 401 }
      );
    }

    if (role !== "TEACHER") {
      return NextResponse.json(
        { message: "Chỉ giáo viên mới được xem kết quả" },
        { status: 403 }
      );
    }

    // =========================
    // 2. Lấy assignment ID
    // =========================
    const { id: assignmentId } = await context.params;

    // =========================
    // 3. Kiểm tra assignment
    // =========================
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId,
      },
      include: {
        exercise: {
          select: {
            id: true,
            title: true,
            questions: {
              select: {
                id: true,
              },
            },
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            code: true,
            grade: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { message: "Không tìm thấy bài tập" },
        { status: 404 }
      );
    }

    // =========================
    // 4. Lấy submissions
    // =========================
    const submissions = await prisma.submission.findMany({
      where: {
        assignmentId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    // =========================
    // 5. Format dữ liệu
    // =========================
    const totalQuestions = assignment.exercise.questions.length;

    const results = submissions.map((submission) => {
      const score = submission.score ?? 0;

      const correctCount =
        totalQuestions > 0
          ? Math.round((score / 10) * totalQuestions)
          : 0;

      return {
        id: submission.id,
        student: submission.student,
        score,
        correctCount,
        totalQuestions,
        submittedAt: submission.submittedAt,
      };
    });

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        exercise: assignment.exercise,
        class: assignment.class,
      },
      results,
    });
  } catch (error) {
    console.error(
      "GET /api/teacher/assignments/[id]/submissions error:",
      error
    );

    return NextResponse.json(
      { message: "Lỗi server" },
      { status: 500 }
    );
  }
}