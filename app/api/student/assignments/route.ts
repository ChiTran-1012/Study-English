import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function GET(request: NextRequest) {
  try {
    // =========================
    // Kiểm tra đăng nhập
    // =========================

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Chưa đăng nhập",
        },
        {
          status: 401,
        }
      );
    }

    // =========================
    // Kiểm tra JWT
    // =========================

    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "STUDENT") {
      return NextResponse.json(
        {
          message: "Chỉ học sinh mới được truy cập",
        },
        {
          status: 403,
        }
      );
    }

    const studentId = payload.id as string;

    // =========================
    // Lấy các lớp học sinh tham gia
    // =========================

    const classMembers = await prisma.classMember.findMany({
      where: {
        studentId,
      },
      select: {
        classId: true,
      },
    });

    const classIds = classMembers.map(
      (member) => member.classId
    );

    // Nếu học sinh chưa tham gia lớp nào
    if (classIds.length === 0) {
      return NextResponse.json([]);
    }

    // =========================
    // Lấy Assignment
    // =========================

    const assignments = await prisma.assignment.findMany({
      where: {
        classId: {
          in: classIds,
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

        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error(
      "GET STUDENT ASSIGNMENTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        message: "Lỗi server",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}