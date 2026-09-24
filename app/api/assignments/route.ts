import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

// =========================
// GET: Lấy danh sách Assignment
// =========================
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

    const assignments = await prisma.assignment.findMany({
      where: {
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("GET ASSIGNMENTS ERROR:", error);

    return NextResponse.json(
      {
        message: "Lỗi server",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// =========================
// POST: Tạo Assignment
// =========================
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
        { message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    const body = await request.json();

    const {
      exerciseId,
      classId,
      title,
      description,
      startAt,
      dueAt,
    } = body;

    // =========================
    // Validate dữ liệu
    // =========================

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Vui lòng chọn bài tập" },
        { status: 400 }
      );
    }

    if (!classId) {
      return NextResponse.json(
        { message: "Vui lòng chọn lớp" },
        { status: 400 }
      );
    }

    // =========================
    // Kiểm tra Exercise
    // =========================

    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        teacherId,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { message: "Không tìm thấy bài tập hoặc bạn không có quyền" },
        { status: 404 }
      );
    }

    // =========================
    // Kiểm tra Class
    // =========================

    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId,
      },
    });

    if (!classData) {
      return NextResponse.json(
        { message: "Không tìm thấy lớp hoặc bạn không có quyền" },
        { status: 404 }
      );
    }

    // =========================
    // Kiểm tra ngày
    // =========================

    const parsedStartAt = startAt
      ? new Date(startAt)
      : new Date();

    const parsedDueAt = dueAt
      ? new Date(dueAt)
      : null;

    if (Number.isNaN(parsedStartAt.getTime())) {
      return NextResponse.json(
        { message: "Ngày bắt đầu không hợp lệ" },
        { status: 400 }
      );
    }

    if (parsedDueAt && Number.isNaN(parsedDueAt.getTime())) {
      return NextResponse.json(
        { message: "Hạn nộp không hợp lệ" },
        { status: 400 }
      );
    }

    if (parsedDueAt && parsedDueAt <= parsedStartAt) {
      return NextResponse.json(
        { message: "Hạn nộp phải sau ngày bắt đầu" },
        { status: 400 }
      );
    }

    // =========================
    // Tạo Assignment
    // =========================

    const assignment = await prisma.assignment.create({
      data: {
        exerciseId,
        classId,
        teacherId,
        title: title?.trim() || null,
        description: description?.trim() || null,
        startAt: parsedStartAt,
        dueAt: parsedDueAt,
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
          },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("POST ASSIGNMENT ERROR:", error);

    return NextResponse.json(
      {
        message: "Lỗi server",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}