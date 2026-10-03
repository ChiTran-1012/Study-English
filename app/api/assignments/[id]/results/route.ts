import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{
    id: string;
  }>;
};

// ======================================================
// GET - Giáo viên xem kết quả học sinh
// ======================================================

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    // --------------------------------------------------
    // 1. Kiểm tra token
    // --------------------------------------------------

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 2. Verify JWT
    // --------------------------------------------------

    const { payload } = await jwtVerify(token, secret);

    const role = payload.role as string;
    const teacherId = payload.id as string;

    if (role !== "TEACHER") {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // 3. Lấy assignment ID
    // --------------------------------------------------

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Thiếu assignment ID" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 4. Kiểm tra Assignment thuộc giáo viên
    // --------------------------------------------------

    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        teacherId,
      },

      include: {
        exercise: {
          select: {
            id: true,
            title: true,
            skill: true,
            difficulty: true,
          },
        },

        class: {
          select: {
            id: true,
            name: true,
            code: true,
            grade: true,

            members: {
              select: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },

        submissions: {
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
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy assignment" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 5. Tạo danh sách kết quả
    // --------------------------------------------------

    const submissionMap = new Map(
      assignment.submissions.map((submission) => [
        submission.studentId,
        submission,
      ])
    );

    const results = assignment.class.members.map((member) => {
      const submission = submissionMap.get(member.student.id);

      return {
        student: member.student,

        status: submission
          ? "SUBMITTED"
          : "NOT_SUBMITTED",

        score: submission?.score ?? null,

        submittedAt: submission?.submittedAt ?? null,

        submissionId: submission?.id ?? null,
      };
    });

    // --------------------------------------------------
    // 6. Thống kê
    // --------------------------------------------------

    const submittedResults = results.filter(
      (item) => item.status === "SUBMITTED"
    );

    const scores = submittedResults
      .map((item) => item.score)
      .filter(
        (score): score is number =>
          score !== null
      );

    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) /
          scores.length
        : 0;

    // --------------------------------------------------
    // 7. Response
    // --------------------------------------------------

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,

        exercise: assignment.exercise,

        class: assignment.class
          ? {
              id: assignment.class.id,
              name: assignment.class.name,
              code: assignment.class.code,
              grade: assignment.class.grade,
            }
          : null,

        startAt: assignment.startAt,
        dueAt: assignment.dueAt,
      },

      statistics: {
        totalStudents: results.length,
        submittedStudents: submittedResults.length,
        notSubmittedStudents:
          results.length - submittedResults.length,

        averageScore: Number(
          averageScore.toFixed(2)
        ),
      },

      results,
    });
  } catch (error) {
    console.error(
      "GET /api/assignments/[id]/results ERROR:",
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