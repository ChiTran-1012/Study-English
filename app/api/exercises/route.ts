import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

// =========================
// GET - Lấy danh sách bài tập
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

    if (!teacherId) {
      return NextResponse.json(
        { message: "Không xác định được giáo viên" },
        { status: 401 }
      );
    }

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

// =========================
// POST - Tạo bài tập
// =========================
export async function POST(request: NextRequest) {
  try {
    // -------------------------
    // 1. Kiểm tra đăng nhập
    // -------------------------
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // -------------------------
    // 2. Kiểm tra JWT
    // -------------------------
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        { message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    if (!teacherId) {
      return NextResponse.json(
        { message: "Không xác định được giáo viên" },
        { status: 401 }
      );
    }

    // -------------------------
    // 3. Đọc dữ liệu từ frontend
    // -------------------------
    const body = await request.json();

    const {
      title,
      description,
      skill,
      difficulty,
      source,
    } = body;

    // -------------------------
    // 4. Validate dữ liệu
    // -------------------------
    if (!title || !title.trim()) {
      return NextResponse.json(
        { message: "Tên bài tập không được để trống" },
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

    // -------------------------
    // 5. Kiểm tra enum Skill
    // -------------------------
    const validSkills = [
      "LISTENING",
      "SPEAKING",
      "READING",
      "WRITING",
    ];

    if (!validSkills.includes(skill)) {
      return NextResponse.json(
        { message: "Kỹ năng không hợp lệ" },
        { status: 400 }
      );
    }

    // -------------------------
    // 6. Kiểm tra enum Difficulty
    // -------------------------
    const validDifficulties = [
      "EASY",
      "MEDIUM",
      "HARD",
    ];

    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { message: "Độ khó không hợp lệ" },
        { status: 400 }
      );
    }

    // -------------------------
    // 7. Kiểm tra source
    // -------------------------
    const exerciseSource =
      source === "AI" ? "AI" : "MANUAL";

    // -------------------------
    // 8. Tạo Exercise
    // -------------------------
    const exercise = await prisma.exercise.create({
      data: {
        title: title.trim(),
        description:
          description?.trim() || null,
        skill,
        difficulty,
        source: exerciseSource,
        teacherId,
      },
    });

    // -------------------------
    // 9. Trả kết quả
    // -------------------------
    return NextResponse.json(
      exercise,
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE EXERCISE ERROR:",
      error
    );

    return NextResponse.json(
      {
        message: "Không thể tạo bài tập",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}