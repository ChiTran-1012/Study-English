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
    // 3. Lấy lịch sử làm bài
    // =========================
    const submissions =
      await prisma.submission.findMany({
        where: {
          studentId,
        },
        include: {
          assignment: {
            include: {
              exercise: {
                select: {
                  id: true,
                  title: true,
                  description: true,
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
                },
              },
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
      });

    // =========================
    // 4. Format dữ liệu
    // =========================
    const history = submissions.map(
      (submission) => ({
        id: submission.id,

        assignmentId:
          submission.assignmentId,

        exercise:
          submission.assignment.exercise,

        class:
          submission.assignment.class,

        score: submission.score,

        submittedAt:
          submission.submittedAt,

        createdAt:
          submission.createdAt,
      })
    );

    // =========================
    // 5. Trả kết quả
    // =========================
    return NextResponse.json(history);
  } catch (error) {
    console.error(
      "GET STUDENT HISTORY ERROR:",
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