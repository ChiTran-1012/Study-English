
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Skill =
  | "LISTENING"
  | "SPEAKING"
  | "READING"
  | "WRITING";

const SKILLS: Skill[] = [
  "LISTENING",
  "SPEAKING",
  "READING",
  "WRITING",
];

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function average(scores: number[]): number | null {
  if (scores.length === 0) {
    return null;
  }

  return round2(
    scores.reduce((sum, score) => sum + score, 0) /
      scores.length
  );
}

export async function GET(request: NextRequest) {
  try {
    // ==========================================
    // 1. AUTHENTICATION
    // ==========================================

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
        typeof payload.id !== "string" ||
        !payload.id
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

    // ==========================================
    // 2. GET STUDENT CLASSES
    // ==========================================

    const memberships = await prisma.classMember.findMany({
      where: { studentId },
      select: { classId: true },
    });

    const classIds = memberships.map(
      (membership) => membership.classId
    );

    // ==========================================
    // 3. GET ASSIGNMENTS AND SUBMISSIONS
    // ==========================================

    const assignments = await prisma.assignment.findMany({
      where: {
        classId: { in: classIds },
      },
      select: {
        id: true,
        dueAt: true,
        exercise: {
          select: {
            skill: true,
          },
        },
        submissions: {
          where: { studentId },
          select: {
            id: true,
            score: true,
            submittedAt: true,
          },
        },
      },
    });

    // ==========================================
    // 4. SUMMARY
    // ==========================================

    let submittedAssignments = 0;
    let gradedAssignments = 0;
    let awaitingGrading = 0;
    let pendingAssignments = 0;
    let expiredAssignments = 0;

    const allScores: number[] = [];

    const skillScores: Record<Skill, number[]> = {
      LISTENING: [],
      SPEAKING: [],
      READING: [],
      WRITING: [],
    };

    const now = Date.now();

    for (const assignment of assignments) {
      const submission = assignment.submissions[0];

      const isSubmitted =
        submission?.submittedAt != null;

      if (!isSubmitted) {
        const isExpired =
          assignment.dueAt != null &&
          new Date(assignment.dueAt).getTime() < now;

        if (isExpired) {
          expiredAssignments++;
        } else {
          pendingAssignments++;
        }

        continue;
      }

      submittedAssignments++;

      // Đã nộp nhưng chưa có điểm cuối cùng
      if (
        submission.score === null ||
        !Number.isFinite(submission.score)
      ) {
        awaitingGrading++;
        continue;
      }

      gradedAssignments++;

      allScores.push(submission.score);

      const skill = assignment.exercise.skill;

      skillScores[skill].push(submission.score);
    }

    // ==========================================
    // 5. AVERAGE SCORES BY SKILL
    // ==========================================

    const skillProgress: Record<Skill, number | null> = {
      LISTENING: average(skillScores.LISTENING),
      SPEAKING: average(skillScores.SPEAKING),
      READING: average(skillScores.READING),
      WRITING: average(skillScores.WRITING),
    };

    const skillStats = Object.fromEntries(
      SKILLS.map((skill) => [
        skill,
        {
          averageScore: skillProgress[skill],
          gradedCount: skillScores[skill].length,
        },
      ])
    ) as Record<
      Skill,
      {
        averageScore: number | null;
        gradedCount: number;
      }
    >;

    // ==========================================
    // 6. RESPONSE
    // ==========================================

    return NextResponse.json(
      {
        totalAssignments: assignments.length,

        // Giữ tên cũ để tương thích Dashboard
        completedAssignments: submittedAssignments,

        submittedAssignments,
        gradedAssignments,
        awaitingGrading,
        pendingAssignments,
        expiredAssignments,

        // Thang điểm 0–10
        averageScore: average(allScores),

        skillProgress,
        skillStats,
        scoreScale: 10,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET STUDENT PROGRESS ERROR:", error);

    return NextResponse.json(
      {
        message: "Không thể tải thống kê học tập",
      },
      { status: 500 }
    );
  }
}
