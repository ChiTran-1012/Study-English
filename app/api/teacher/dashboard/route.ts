
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Skill = "READING" | "LISTENING" | "SPEAKING" | "WRITING";

const SKILLS: Skill[] = [
  "READING",
  "LISTENING",
  "SPEAKING",
  "WRITING",
];

function average(values: number[]): number | null {
  if (values.length === 0) return null;

  const total = values.reduce((sum, value) => sum + value, 0);

  return Math.round((total / values.length) * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Kiểm tra đăng nhập
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    let teacherId: string;

    try {
      const { payload } = await jwtVerify(token, secret);

      if (payload.role !== "TEACHER") {
        return NextResponse.json(
          { message: "Không có quyền truy cập" },
          { status: 403 }
        );
      }

      if (typeof payload.id !== "string" || !payload.id) {
        return NextResponse.json(
          { message: "Không xác định được giáo viên" },
          { status: 401 }
        );
      }

      teacherId = payload.id;
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    // 2. Lấy thông tin giáo viên
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json(
        { message: "Không tìm thấy giáo viên" },
        { status: 404 }
      );
    }

    // 3. Lấy dữ liệu thuộc giáo viên
    const [classes, totalExercises, assignments] = await Promise.all([
      prisma.class.findMany({
        where: { teacherId },
        select: {
          id: true,
          name: true,
          code: true,
          grade: true,
          createdAt: true,
          members: {
            select: {
              studentId: true,
            },
          },
          _count: {
            select: {
              assignments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.exercise.count({
        where: { teacherId },
      }),

      prisma.assignment.findMany({
        where: {
          teacherId,
          class: {
            teacherId,
          },
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          dueAt: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          exercise: {
            select: {
              id: true,
              title: true,
              skill: true,
            },
          },
          submissions: {
            select: {
              id: true,
              studentId: true,
              score: true,
              submittedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // 4. Thống kê học sinh duy nhất
    const uniqueStudentIds = new Set(
      classes.flatMap((classItem) =>
        classItem.members.map((member) => member.studentId)
      )
    );

    // 5. Thống kê bài nộp
    let totalSubmissions = 0;
    let awaitingGrading = 0;
    let gradedSubmissions = 0;

    const allScores: number[] = [];

    const skillScores: Record<Skill, number[]> = {
      READING: [],
      LISTENING: [],
      SPEAKING: [],
      WRITING: [],
    };

    for (const assignment of assignments) {
      for (const submission of assignment.submissions) {
        // Chưa nộp bài thì không tính
        if (submission.submittedAt === null) {
          continue;
        }

        totalSubmissions++;

        if (submission.score === null) {
          awaitingGrading++;
          continue;
        }

        gradedSubmissions++;

        allScores.push(submission.score);
        skillScores[assignment.exercise.skill].push(
          submission.score
        );
      }
    }

    // 6. Điểm trung bình theo kỹ năng
    const skillProgress: Record<Skill, number | null> = {
      READING: average(skillScores.READING),
      LISTENING: average(skillScores.LISTENING),
      SPEAKING: average(skillScores.SPEAKING),
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
    );

    // 7. Danh sách lớp học
    const recentClasses = classes.slice(0, 5).map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      grade: item.grade,
      studentCount: item.members.length,
      assignmentCount: item._count.assignments,
    }));

    // 8. Bài tập gần đây
    const recentAssignments = assignments.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.title || item.exercise.title,
      skill: item.exercise.skill,
      className: item.class.name,
      classId: item.class.id,
      createdAt: item.createdAt,
      dueAt: item.dueAt,
      submittedCount: item.submissions.filter(
        (submission) => submission.submittedAt !== null
      ).length,
      awaitingGradingCount: item.submissions.filter(
        (submission) =>
          submission.submittedAt !== null &&
          submission.score === null
      ).length,
    }));

    // 9. Kết quả trả về
    return NextResponse.json(
      {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
        },

        statistics: {
          totalClasses: classes.length,
          totalStudents: uniqueStudentIds.size,
          totalExercises,
          totalAssignments: assignments.length,
          totalSubmissions,
          awaitingGrading,
          gradedSubmissions,
          averageScore: average(allScores),
        },

        skillProgress,
        skillStats,
        recentClasses,
        recentAssignments,
        scoreScale: 10,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("TEACHER DASHBOARD ERROR:", error);

    return NextResponse.json(
      { message: "Không thể tải Teacher Dashboard" },
      { status: 500 }
    );
  }
}
