import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {prisma} from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function GET(request: NextRequest) {
  try {
    // =========================
    // 1. Lấy token
    // =========================
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // =========================
    // 2. Verify JWT
    // =========================
    const { payload } = await jwtVerify(token, secret);

    const studentId = payload.id as string;
    const role = payload.role as string;

    if (!studentId || role !== "STUDENT") {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // =========================
    // 3. Lấy các lớp Student tham gia
    // =========================
    const memberships = await prisma.classMember.findMany({
      where: {
        studentId,
      },
      select: {
        classId: true,
      },
    });

    const classIds = memberships.map((item) => item.classId);

    // Nếu Student chưa tham gia lớp
    if (classIds.length === 0) {
      return NextResponse.json({
        totalAssignments: 0,
        completedAssignments: 0,
        pendingAssignments: 0,
        averageScore: 0,
        skills: {
          LISTENING: 0,
          SPEAKING: 0,
          READING: 0,
          WRITING: 0,
        },
      });
    }

    // =========================
    // 4. Lấy Assignment
    // =========================
    const assignments = await prisma.assignment.findMany({
      where: {
        classId: {
          in: classIds,
        },
      },
      include: {
        exercise: {
          select: {
            id: true,
            skill: true,
          },
        },
        submissions: {
          where: {
            studentId,
          },
          select: {
            id: true,
            score: true,
            submittedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // =========================
    // 5. Tổng số bài
    // =========================
    const totalAssignments = assignments.length;

    const completedAssignments = assignments.filter(
      (assignment) => assignment.submissions.length > 0
    ).length;

    const pendingAssignments =
      totalAssignments - completedAssignments;

    // =========================
    // 6. Tính điểm trung bình
    // =========================
    const submittedScores = assignments
      .flatMap((assignment) => assignment.submissions)
      .map((submission) => submission.score)
      .filter(
        (score): score is number =>
          score !== null && score !== undefined
      );

    const averageScore =
      submittedScores.length > 0
        ? submittedScores.reduce(
            (sum, score) => sum + score,
            0
          ) / submittedScores.length
        : 0;

    // =========================
    // 7. Tính điểm theo kỹ năng
    // =========================
    const skillScores: Record<string, number[]> = {
      LISTENING: [],
      SPEAKING: [],
      READING: [],
      WRITING: [],
    };

    assignments.forEach((assignment) => {
      const skill = assignment.exercise.skill;

      assignment.submissions.forEach((submission) => {
        if (
          submission.score !== null &&
          submission.score !== undefined &&
          skillScores[skill]
        ) {
          skillScores[skill].push(submission.score);
        }
      });
    });

    const skills = {
      LISTENING:
        skillScores.LISTENING.length > 0
          ? skillScores.LISTENING.reduce(
              (sum, score) => sum + score,
              0
            ) / skillScores.LISTENING.length
          : 0,

      SPEAKING:
        skillScores.SPEAKING.length > 0
          ? skillScores.SPEAKING.reduce(
              (sum, score) => sum + score,
              0
            ) / skillScores.SPEAKING.length
          : 0,

      READING:
        skillScores.READING.length > 0
          ? skillScores.READING.reduce(
              (sum, score) => sum + score,
              0
            ) / skillScores.READING.length
          : 0,

      WRITING:
        skillScores.WRITING.length > 0
          ? skillScores.WRITING.reduce(
              (sum, score) => sum + score,
              0
            ) / skillScores.WRITING.length
          : 0,
    };

    // =========================
    // 8. Trả kết quả
    // =========================
    return NextResponse.json({
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      averageScore: Number(averageScore.toFixed(2)),
      skills: {
        LISTENING: Number(skills.LISTENING.toFixed(2)),
        SPEAKING: Number(skills.SPEAKING.toFixed(2)),
        READING: Number(skills.READING.toFixed(2)),
        WRITING: Number(skills.WRITING.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("GET STUDENT PROGRESS ERROR:", error);

    return NextResponse.json(
      {
        error: "Lỗi server",
      },
      {
        status: 500,
      }
    );
  }
}