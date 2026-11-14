import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

async function getTeacherId(request: NextRequest): Promise<string | NextResponse> {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "TEACHER") {
      return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
    }
    if (typeof payload.id !== "string" || !payload.id) {
      return NextResponse.json({ message: "Không xác định được giáo viên" }, { status: 401 });
    }
    return payload.id;
  } catch {
    return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ" }, { status: 401 });
  }
}

const assignmentInclude = {
  exercise: {
    select: {
      id: true,
      title: true,
      skill: true,
      difficulty: true,
      source: true,
      _count: { select: { questions: true } },
    },
  },
  class: {
    select: { id: true, name: true, code: true, grade: true },
  },
} as const;

export async function GET(request: NextRequest) {
  const teacherId = await getTeacherId(request);
  if (teacherId instanceof NextResponse) return teacherId;

  try {
    const assignments = await prisma.assignment.findMany({
      where: { teacherId },
      include: assignmentInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("GET TEACHER ASSIGNMENTS ERROR:", error);
    return NextResponse.json(
      { message: "Không thể tải danh sách bài được giao" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const teacherId = await getTeacherId(request);
  if (teacherId instanceof NextResponse) return teacherId;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const exerciseId = input.exerciseId;
    const classId = input.classId;

    if (typeof exerciseId !== "string" || !exerciseId.trim()) {
      return NextResponse.json({ message: "Vui lòng chọn bài tập" }, { status: 400 });
    }
    if (typeof classId !== "string" || !classId.trim()) {
      return NextResponse.json({ message: "Vui lòng chọn lớp" }, { status: 400 });
    }

    for (const field of ["title", "description", "startAt", "dueAt"] as const) {
      if (input[field] != null && typeof input[field] !== "string") {
        return NextResponse.json({ message: `Trường ${field} không hợp lệ` }, { status: 400 });
      }
    }

    const [exercise, classData] = await Promise.all([
      prisma.exercise.findFirst({ where: { id: exerciseId, teacherId }, select: { id: true } }),
      prisma.class.findFirst({ where: { id: classId, teacherId }, select: { id: true } }),
    ]);
    if (!exercise) {
      return NextResponse.json({ message: "Bài tập không tồn tại hoặc không thuộc giáo viên" }, { status: 404 });
    }
    if (!classData) {
      return NextResponse.json({ message: "Lớp không tồn tại hoặc không thuộc giáo viên" }, { status: 404 });
    }

    const startAt = typeof input.startAt === "string" && input.startAt.trim()
      ? new Date(input.startAt) : new Date();
    const dueAt = typeof input.dueAt === "string" && input.dueAt.trim()
      ? new Date(input.dueAt) : null;

    if (Number.isNaN(startAt.getTime()) || (dueAt && Number.isNaN(dueAt.getTime()))) {
      return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
    }
    if (dueAt && dueAt <= startAt) {
      return NextResponse.json({ message: "Hạn nộp phải sau ngày bắt đầu" }, { status: 400 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        exerciseId,
        classId,
        teacherId,
        title: typeof input.title === "string" ? input.title.trim() || null : null,
        description: typeof input.description === "string" ? input.description.trim() || null : null,
        startAt,
        dueAt,
      },
      include: assignmentInclude,
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("POST TEACHER ASSIGNMENTS ERROR:", error);
    return NextResponse.json({ message: "Không thể giao bài tập" }, { status: 500 });
  }
}
