import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  let studentId: string;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "STUDENT") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }
    if (typeof payload.id !== "string" || !payload.id) {
      return NextResponse.json({ error: "Không xác định được học sinh" }, { status: 401 });
    }
    studentId = payload.id;
  } catch {
    return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ" }, { status: 401 });
  }

  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        class: {
          members: { some: { studentId } },
        },
      },
      include: {
        exercise: {
          select: {
            id: true,
            title: true,
            description: true,
            skill: true,
            difficulty: true,
            source: true,
            _count: { select: { questions: true } },
          },
        },
        class: {
          select: { id: true, name: true, code: true, grade: true },
        },
        teacher: {
          select: { id: true, name: true },
        },
        submissions: {
          where: { studentId },
          select: { id: true, score: true, submittedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("GET STUDENT ASSIGNMENTS ERROR:", error);
    return NextResponse.json(
      {
        error: "Không thể tải danh sách bài tập",
        ...(process.env.NODE_ENV === "development" && error instanceof Error
          ? { detail: error.message }
          : {}),
      },
      { status: 500 }
    );
  }
}
