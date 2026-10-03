import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function GET(request: NextRequest) {
  try {
    // =========================
    // 1. Kiểm tra đăng nhập
    // =========================
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Chưa đăng nhập",
        },
        {
          status: 401,
        }
      );
    }

    // =========================
    // 2. Kiểm tra JWT
    // =========================
    const { payload } = await jwtVerify(
      token,
      secret
    );

    if (payload.role !== "STUDENT") {
      return NextResponse.json(
        {
          message: "Không có quyền truy cập",
        },
        {
          status: 403,
        }
      );
    }

    const studentId = payload.id as string;

    if (!studentId) {
      return NextResponse.json(
        {
          message: "Không xác định được học sinh",
        },
        {
          status: 401,
        }
      );
    }

    // =========================
    // 3. Lấy các lớp Student tham gia
    // =========================
    const classMembers =
      await prisma.classMember.findMany({
        where: {
          studentId,
        },
        select: {
          classId: true,
        },
      });

    const classIds = classMembers.map(
      (item) => item.classId
    );

    // =========================
    // 4. Lấy Assignment
    // =========================
    const assignments =
      await prisma.assignment.findMany({
        where: {
          classId: {
            in: classIds,
          },
        },
        include: {
          exercise: {
            select: {
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
    // 5. Tính tổng quan
    // =========================
    const totalAssignments =
      assignments.length;

    const completedAssignments =
      assignments.filter(
        (assignment) =>
          assignment.submissions.length > 0
      ).length;

    const pendingAssignments =
      totalAssignments -
      completedAssignments;

    // =========================
    // 6. Tính điểm trung bình
    // =========================
    const submittedScores =
      assignments
        .flatMap(
          (assignment) =>
            assignment.submissions
        )
        .map(
          (submission) =>
            submission.score
        )
        .filter(
          (score): score is number =>
            score !== null
        );

    const averageScore =
      submittedScores.length > 0
        ? submittedScores.reduce(
            (sum, score) =>
              sum + score,
            0
          ) / submittedScores.length
        : 0;

    // =========================
    // 7. Tính điểm theo kỹ năng
    // =========================
    const skillScores: Record<
      string,
      number[]
    > = {
      LISTENING: [],
      SPEAKING: [],
      READING: [],
      WRITING: [],
    };

    assignments.forEach(
      (assignment) => {
        const skill =
          assignment.exercise.skill;

        assignment.submissions.forEach(
          (submission) => {
            if (
              submission.score !== null &&
              skillScores[skill]
            ) {
              skillScores[skill].push(
                submission.score
              );
            }
          }
        );
      }
    );

    const skillProgress = {
      LISTENING:
        calculateAverage(
          skillScores.LISTENING
        ),

      SPEAKING:
        calculateAverage(
          skillScores.SPEAKING
        ),

      READING:
        calculateAverage(
          skillScores.READING
        ),

      WRITING:
        calculateAverage(
          skillScores.WRITING
        ),
    };

    // =========================
    // 8. Trả kết quả
    // =========================
    return NextResponse.json({
      totalAssignments,
      completedAssignments,
      pendingAssignments,

      averageScore:
        Math.round(
          averageScore * 100
        ) / 100,

      skillProgress,
    });
  } catch (error) {
    console.error(
      "GET STUDENT PROGRESS ERROR:",
      error
    );

    return NextResponse.json(
      {
        message: "Lỗi server",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================
// Hàm tính trung bình
// =========================
function calculateAverage(
  scores: number[]
) {
  if (scores.length === 0) {
    return 0;
  }

  const average =
    scores.reduce(
      (sum, score) =>
        sum + score,
      0
    ) / scores.length;

  return Math.round(
    average * 100
  ) / 100;
}