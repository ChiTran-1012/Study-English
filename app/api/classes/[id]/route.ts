import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
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

    const classData = await prisma.class.findFirst({
      where: {
        id,
        teacherId,
      },
      include: {
        members: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            joinedAt: "desc",
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json(
        { message: "Không tìm thấy lớp học" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      class: classData,
    });
  } catch (error) {
    console.error("GET CLASS DETAIL ERROR:", error);

    return NextResponse.json(
      { message: "Không thể lấy thông tin lớp" },
      { status: 500 }
    );
  }
}