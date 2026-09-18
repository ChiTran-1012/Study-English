import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

// ===============================
// GET /api/exercises
// Lấy danh sách exercise của teacher
// ===============================
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

    return NextResponse.json({
      exercises,
    });
  } catch (error) {
    console.error("GET EXERCISES ERROR:", error);

    return NextResponse.json(
      { message: "Không thể lấy danh sách bài tập" },
      { status: 500 }
    );
  }
}

// ===============================
// POST /api/exercises
// Tạo exercise mới
// ===============================
export async function POST(request: NextRequest) {
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
        { message: "Không có quyền tạo bài tập" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    const body = await request.json();

    const {
      title,
      description,
      skill,
      difficulty,
      source,
    } = body;

    // ===============================
    // Validate
    // ===============================

    if (!title?.trim()) {
      return NextResponse.json(
        { message: "Vui lòng nhập tên bài tập" },
        { status: 400 }
      );
    }

    if (!skill) {
      return NextResponse.json(
        { message: "Vui lòng chọn kỹ năng" },
        { status: 400 }
      );
    }

    if (!difficulty) {
      return NextResponse.json(
        { message: "Vui lòng chọn độ khó" },
        { status: 400 }
      );
    }

    // ===============================
    // Create Exercise
    // ===============================

    const exercise = await prisma.exercise.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        skill,
        difficulty,
        source: source || "MANUAL",
        teacherId,
      },
    });

    return NextResponse.json(
      {
        message: "Tạo bài tập thành công",
        exercise,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE EXERCISE ERROR:", error);

    return NextResponse.json(
      { message: "Không thể tạo bài tập" },
      { status: 500 }
    );
  }
}