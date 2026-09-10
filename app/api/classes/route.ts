import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

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
        { message: "Bạn không có quyền truy cập" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    if (!teacherId) {
      return NextResponse.json(
        { message: "Token không chứa teacher ID" },
        { status: 401 }
      );
    }

    const classes = await prisma.class.findMany({
      where: {
        teacherId: teacherId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      classes,
    });

  } catch (error) {
    console.error("GET CLASSES ERROR:", error);

    return NextResponse.json(
      {
        message: "Không thể lấy danh sách lớp",
      },
      {
        status: 500,
      }
    );
  }
}

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
        { message: "Bạn không có quyền tạo lớp" },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    const body = await request.json();

    const {
      name,
      code,
      grade,
      description,
    } = body;

    if (!name || !code || !grade) {
      return NextResponse.json(
        {
          message: "Vui lòng nhập đầy đủ thông tin",
        },
        {
          status: 400,
        }
      );
    }

    const existingClass = await prisma.class.findUnique({
      where: {
        code: code.toUpperCase(),
      },
    });

    if (existingClass) {
      return NextResponse.json(
        {
          message: "Mã lớp đã tồn tại",
        },
        {
          status: 409,
        }
      );
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        code: code.toUpperCase(),
        grade: Number(grade),
        description: description || null,
        teacherId,
      },
    });

    return NextResponse.json(
      {
        message: "Tạo lớp thành công",
        class: newClass,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("CREATE CLASS ERROR:", error);

    return NextResponse.json(
      {
        message: "Không thể tạo lớp",
      },
      {
        status: 500,
      }
    );
  }
}