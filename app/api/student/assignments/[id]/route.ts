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

    if (payload.role !== "STUDENT") {
      return NextResponse.json(
        { message: "Chỉ học sinh mới được truy cập" },
        { status: 403 }
      );
    }

    const studentId = payload.id as string;
    const { id } = await context.params;

    // Kiểm tra Student có thuộc Class của Assignment không
    const assignment = await prisma.assignment.findFirst({
      where: {
        id,

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
                options: {
                  select: {
                    id: true,
                    label: true,
                    content: true,
                  },
                },
              },
              orderBy: {
                order: "asc",
              },
            },
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

        class: {
          select: {
            id: true,
            name: true,
            code: true,
            grade: true,
          },
        },

        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        {
          message:
            "Không tìm thấy bài tập hoặc bạn không thuộc lớp này",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error(
      "GET STUDENT ASSIGNMENT DETAIL ERROR:",
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
      { status: 500 }
    );
  }
}