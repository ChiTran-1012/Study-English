
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

// GET /api/student/classes
// Lấy các lớp mà học sinh hiện tại đã tham gia
export async function GET(request: NextRequest) {
  try {
    // 1. Kiểm tra token đăng nhập
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // 2. Xác thực JWT
    let studentId: string;

    try {
      const { payload } = await jwtVerify(token, secret);

      if (payload.role !== "STUDENT") {
        return NextResponse.json(
          { error: "Không có quyền truy cập" },
          { status: 403 }
        );
      }

      if (
        typeof payload.id !== "string" ||
        !payload.id
      ) {
        return NextResponse.json(
          { error: "Không xác định được học sinh" },
          { status: 401 }
        );
      }

      studentId = payload.id;
    } catch {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    // 3. Truy vấn các lớp mà học sinh đã tham gia
    const classes = await prisma.class.findMany({
      where: {
        members: {
          some: {
            studentId,
          },
        },
      },

      select: {
        id: true,
        name: true,
        code: true,
        grade: true,
        description: true,
        createdAt: true,

        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        _count: {
          select: {
            members: true,
            assignments: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    // 4. Trả về JSON cho frontend
    return NextResponse.json(
      { classes },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "GET STUDENT CLASSES ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Không thể tải danh sách lớp học",
        ...(process.env.NODE_ENV === "development" &&
        error instanceof Error
          ? { detail: error.message }
          : {}),
      },
      { status: 500 }
    );
  }
}
