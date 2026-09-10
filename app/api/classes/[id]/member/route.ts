import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function POST(
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
        { message: "Không có quyền" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    const { id: classId } = await context.params;

    const body = await request.json();

    const email = body.email?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { message: "Vui lòng nhập email học sinh" },
        { status: 400 }
      );
    }

    // Kiểm tra lớp thuộc Teacher
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId,
      },
    });

    if (!classData) {
      return NextResponse.json(
        { message: "Không tìm thấy lớp" },
        { status: 404 }
      );
    }

    // Tìm student
    const student = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!student) {
      return NextResponse.json(
        { message: "Không tìm thấy học sinh" },
        { status: 404 }
      );
    }

    if (student.role !== "STUDENT") {
      return NextResponse.json(
        { message: "Tài khoản này không phải học sinh" },
        { status: 400 }
      );
    }

    // Kiểm tra đã tham gia chưa
    const existingMember =
      await prisma.classMember.findUnique({
        where: {
          classId_studentId: {
            classId,
            studentId: student.id,
          },
        },
      });

    if (existingMember) {
      return NextResponse.json(
        { message: "Học sinh đã ở trong lớp" },
        { status: 409 }
      );
    }

    const member =
      await prisma.classMember.create({
        data: {
          classId,
          studentId: student.id,
        },
      });

    return NextResponse.json(
      {
        message: "Thêm học sinh thành công",
        member,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("ADD STUDENT ERROR:", error);

    return NextResponse.json(
      { message: "Không thể thêm học sinh" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        { message: "Không có quyền" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    const { id: classId } = await context.params;

    const body = await request.json();

    const studentId = body.studentId;

    if (!studentId) {
      return NextResponse.json(
        { message: "Thiếu studentId" },
        { status: 400 }
      );
    }

    // Kiểm tra lớp thuộc Teacher
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId,
      },
    });

    if (!classData) {
      return NextResponse.json(
        { message: "Không tìm thấy lớp" },
        { status: 404 }
      );
    }

    await prisma.classMember.delete({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
    });

    return NextResponse.json({
      message: "Xóa học sinh thành công",
    });
  } catch (error) {
    console.error("REMOVE STUDENT ERROR:", error);

    return NextResponse.json(
      {
        message: "Không thể xóa học sinh",
      },
      {
        status: 500,
      }
    );
  }
}