import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

// ===============================
// GET /api/exercises/[id]
// ===============================
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const exercise = await prisma.exercise.findFirst({
      where: {
        id,
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
    });

    if (!exercise) {
      return NextResponse.json(
        { message: "Không tìm thấy bài tập" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      exercise,
    });
  } catch (error) {
    console.error("GET EXERCISE ERROR:", error);

    return NextResponse.json(
      { message: "Không thể lấy bài tập" },
      { status: 500 }
    );
  }
}

// ===============================
// PUT /api/exercises/[id]
// ===============================
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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
        { message: "Không có quyền chỉnh sửa" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    const { id } = await context.params;

    // ===============================
    // Kiểm tra exercise thuộc teacher
    // ===============================

    const existingExercise = await prisma.exercise.findFirst({
      where: {
        id,
        teacherId,
      },
    });

    if (!existingExercise) {
      return NextResponse.json(
        { message: "Không tìm thấy bài tập" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const {
      title,
      description,
      skill,
      difficulty,
      source,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { message: "Vui lòng nhập tên bài tập" },
        { status: 400 }
      );
    }

    const exercise = await prisma.exercise.update({
      where: {
        id,
      },
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        skill,
        difficulty,
        source: source || existingExercise.source,
      },
    });

    return NextResponse.json({
      message: "Cập nhật bài tập thành công",
      exercise,
    });
  } catch (error) {
    console.error("UPDATE EXERCISE ERROR:", error);

    return NextResponse.json(
      { message: "Không thể cập nhật bài tập" },
      { status: 500 }
    );
  }
}

// ===============================
// DELETE /api/exercises/[id]
// ===============================
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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
        { message: "Không có quyền xóa" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    const { id } = await context.params;

    const existingExercise = await prisma.exercise.findFirst({
      where: {
        id,
        teacherId,
      },
    });

    if (!existingExercise) {
      return NextResponse.json(
        { message: "Không tìm thấy bài tập" },
        { status: 404 }
      );
    }

    await prisma.exercise.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Xóa bài tập thành công",
    });
  } catch (error) {
    console.error("DELETE EXERCISE ERROR:", error);

    return NextResponse.json(
      { message: "Không thể xóa bài tập" },
      { status: 500 }
    );
  }
}