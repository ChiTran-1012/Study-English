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

    const { id } = await context.params;

    // =========================
    // Kiểm tra Assignment
    // =========================

    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        teacherId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { message: "Không tìm thấy bài giao" },
        { status: 404 }
      );
    }

    // =========================
    // Xóa Assignment
    // =========================

    await prisma.assignment.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Xóa bài giao thành công",
    });
  } catch (error) {
    console.error("DELETE ASSIGNMENT ERROR:", error);

    return NextResponse.json(
      {
        message: "Lỗi server",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}