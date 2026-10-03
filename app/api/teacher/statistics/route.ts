import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function GET(request: NextRequest) {
  try {
    // ================================================
    // 1. Kiểm tra token
    // ================================================

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // ================================================
    // 2. Verify JWT
    // ================================================

    const { payload } = await jwtVerify(token, secret);

    const role = payload.role as string;
    const teacherId = payload.id as string;

    if (role !== "TEACHER") {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // ================================================
    // 3. Lấy danh sách class của Teacher
    // ================================================

    const classes = await prisma.class.findMany({
      where: {
        teacherId,
      },

      include: {
        members: {
          select: {
            studentId: true,
          },
        },
      },
    });

    // ================================================
    // 4. Lấy Exercise của Teacher
    // ================================================

    const exercises = await prisma.exercise.findMany({
      where: {
        teacherId,
      },

      select: {
        id: true,
        skill: true,
      },
    });

    // ================================================
    // 5. Lấy Assignment của Teacher
    // ================================================

    const assignments =
      await prisma.assignment.findMany({
        where: {
          teacherId,
        },

        select: {
          id: true,
          exerciseId: true,

          submissions: {
            select: {
              id: true,
              score: true,
              submittedAt: true,
            },
          },
        },
      });

    // ================================================
    // 6. Tổng số học sinh
    // ================================================

    const studentIds = new Set<string>();

    classes.forEach((classItem) => {
      classItem.members.forEach((member) => {
        studentIds.add(member.studentId);
      });
    });

    const totalStudents = studentIds.size;

    // ================================================
    // 7. Tổng số Submission
    // ================================================

    const submissions = assignments.flatMap(
      (assignment) =>
        assignment.submissions
    );

    const submittedCount = submissions.filter(
      (submission) =>
        submission.submittedAt !== null
    ).length;

    // ================================================
    // 8. Điểm trung bình
    // ================================================

    const scores = submissions
      .map((submission) => submission.score)
      .filter(
        (score): score is number =>
          score !== null
      );

    const averageScore =
      scores.length > 0
        ? scores.reduce(
            (sum, score) => sum + score,
            0
          ) / scores.length
        : 0;

    // ================================================
    // 9. Thống kê theo Skill
    // ================================================

    const skillStats = {
      LISTENING: {
        exerciseCount: 0,
        assignmentCount: 0,
        submissionCount: 0,
        averageScore: 0,
      },

      SPEAKING: {
        exerciseCount: 0,
        assignmentCount: 0,
        submissionCount: 0,
        averageScore: 0,
      },

      READING: {
        exerciseCount: 0,
        assignmentCount: 0,
        submissionCount: 0,
        averageScore: 0,
      },

      WRITING: {
        exerciseCount: 0,
        assignmentCount: 0,
        submissionCount: 0,
        averageScore: 0,
      },
    };

    // Map Exercise -> Skill

    const exerciseSkillMap = new Map<
      string,
      keyof typeof skillStats
    >();

    exercises.forEach((exercise) => {
      const skill =
        exercise.skill as keyof typeof skillStats;

      if (skillStats[skill]) {
        skillStats[skill].exerciseCount++;

        exerciseSkillMap.set(
          exercise.id,
          skill
        );
      }
    });

    // Assignment -> Skill

    assignments.forEach((assignment) => {
      const skill =
        exerciseSkillMap.get(
          assignment.exerciseId
        );

      if (!skill) return;

      skillStats[skill].assignmentCount++;

      assignment.submissions.forEach(
        (submission) => {
          if (submission.submittedAt) {
            skillStats[skill].submissionCount++;
          }
        }
      );
    });

    // Điểm trung bình từng Skill

    for (const skill of Object.keys(
      skillStats
    ) as Array<keyof typeof skillStats>) {
      const skillScores: number[] = [];

      assignments.forEach((assignment) => {
        const assignmentSkill =
          exerciseSkillMap.get(
            assignment.exerciseId
          );

        if (assignmentSkill !== skill) {
          return;
        }

        assignment.submissions.forEach(
          (submission) => {
            if (submission.score !== null) {
              skillScores.push(
                submission.score
              );
            }
          }
        );
      });

      skillStats[skill].averageScore =
        skillScores.length > 0
          ? Number(
              (
                skillScores.reduce(
                  (sum, score) =>
                    sum + score,
                  0
                ) / skillScores.length
              ).toFixed(2)
            )
          : 0;
    }

    // ================================================
    // 10. Response
    // ================================================

    return NextResponse.json({
      overview: {
        totalClasses: classes.length,

        totalStudents,

        totalExercises:
          exercises.length,

        totalAssignments:
          assignments.length,

        totalSubmissions:
          submissions.length,

        submittedCount,

        averageScore: Number(
          averageScore.toFixed(2)
        ),
      },

      skillStats,
    });
  } catch (error) {
    console.error(
      "GET /api/teacher/statistics ERROR:",
      error
    );

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