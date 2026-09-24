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

export async function DELETE(
  request: NextRequest,
  context: Context
) {
  try {
    const token =
      request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(
      token,
      secret
    );

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        { message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    const { id } = await context.params;

    const question =
      await prisma.question.findFirst({
        where: {
          id,
          exercise: {
            teacherId,
          },
        },
      });

    if (!question) {
      return NextResponse.json(
        {
          message: "Không tìm thấy câu hỏi",
        },
        { status: 404 }
      );
    }

    await prisma.question.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Xóa câu hỏi thành công",
    });
  } catch (error) {
    console.error(
      "DELETE QUESTION ERROR:",
      error
    );

    return NextResponse.json(
      { message: "Lỗi server" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        { message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    const exercises = await prisma.exercise.findMany({
      where: {
        teacherId,
      },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("GET EXERCISES ERROR:", error);

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