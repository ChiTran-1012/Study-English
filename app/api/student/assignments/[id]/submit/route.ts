import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Answers = Record<string, string>;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // =========================
    // 1. Kiểm tra JWT
    // =========================
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, secret);

    const studentId = payload.id as string;
    const role = payload.role as string;

    if (!studentId) {
      return NextResponse.json(
        { message: "Token không hợp lệ" },
        { status: 401 }
      );
    }

    if (role !== "STUDENT") {
      return NextResponse.json(
        { message: "Chỉ học sinh mới được nộp bài" },
        { status: 403 }
      );
    }

    // =========================
    // 2. Lấy assignment ID
    // =========================
    const { id: assignmentId } = await context.params;

    // =========================
    // 3. Lấy đáp án từ client
    // =========================
    const body = await request.json();

    const answers: Answers = body.answers || {};

    // =========================
    // 4. Kiểm tra assignment
    // =========================
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        class: {
          members: {
            some: {
              studentId,
            },
          },
        },
      },
      include: {
        exercise: {
          include: {
            questions: {
              include: {
                options: true,
              },
              orderBy: {
                order: "asc",
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { message: "Không tìm thấy bài tập hoặc bạn không thuộc lớp này" },
        { status: 404 }
      );
    }

    // =========================
    // 5. Kiểm tra thời gian
    // =========================
    const now = new Date();

    if (assignment.startAt > now) {
      return NextResponse.json(
        { message: "Bài tập chưa mở" },
        { status: 400 }
      );
    }
    
    if (assignment.dueAt && assignment.dueAt < now) {
      return NextResponse.json(
        { message: "Bài tập đã hết hạn" },
        { status: 400 }
      );
    }

    // =========================
    // 6. Lấy các câu hỏi
    // =========================
    const questions = assignment.exercise.questions;

    if (questions.length === 0) {
      return NextResponse.json(
        { message: "Bài tập chưa có câu hỏi" },
        { status: 400 }
      );
    }

    // =========================
    // 7. Chấm điểm
    // =========================
    let correctCount = 0;

    for (const question of questions) {
      const selectedOptionId = answers[question.id];

      if (!selectedOptionId) {
        continue;
      }

      const selectedOption = question.options.find(
        (option) => option.id === selectedOptionId
      );

      if (!selectedOption) {
        continue;
      }

      if (selectedOption.isCorrect) {
        correctCount++;
      }
    }

    const totalQuestions = questions.length;

    const score =
      totalQuestions > 0
        ? Number(((correctCount / totalQuestions) * 10).toFixed(2))
        : 0;

    // =========================
    // 8. Kiểm tra submission cũ
    // =========================
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        assignmentId,
        studentId,
      },
    });

    // =========================
    // 9. Không cho nộp lại
    // =========================
    if (existingSubmission?.submittedAt) {
      return NextResponse.json(
        {
          message: "Bạn đã nộp bài này rồi",
          score: existingSubmission.score,
          submittedAt: existingSubmission.submittedAt,
        },
        { status: 400 }
      );
    }

    // =========================
    // 10. Lưu Submission
    // =========================
    const submission = existingSubmission
      ? await prisma.submission.update({
        where: {
          id: existingSubmission.id,
        },
        data: {
          score,
          submittedAt: now,
        },
      })
      : await prisma.submission.create({
        data: {
          assignmentId,
          studentId,
          score,
          submittedAt: now,
        },
      });

    // =========================
    // 11. Trả kết quả
    // =========================
    return NextResponse.json({
      message: "Nộp bài thành công",
      submissionId: submission.id,
      score,
      correctCount,
      totalQuestions,
      submittedAt: submission.submittedAt,
    });
  } catch (error) {
    console.error("POST /api/student/assignments/[id]/submit error:", error);

    return NextResponse.json(
      {
        message: "Lỗi server",
      },
      { status: 500 }
    );
  }
}