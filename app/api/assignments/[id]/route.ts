
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{ id: string }>;
};

async function getTeacherId(
  request: NextRequest
): Promise<string | NextResponse> {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Chưa đăng nhập" },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        { message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    if (
      typeof payload.id !== "string" ||
      !payload.id.trim()
    ) {
      return NextResponse.json(
        { message: "Không xác định được giáo viên" },
        { status: 401 }
      );
    }

    return payload.id;
  } catch {
    return NextResponse.json(
      { message: "Phiên đăng nhập không hợp lệ" },
      { status: 401 }
    );
  }
}

const assignmentInclude = {
  exercise: {
    select: {
      id: true,
      title: true,
      description: true,
      skill: true,
      difficulty: true,
      source: true,
      _count: {
        select: { questions: true },
      },
    },
  },
  class: {
    select: {
      id: true,
      name: true,
      code: true,
      grade: true,
      _count: {
        select: { members: true },
      },
    },
  },
  _count: {
    select: { submissions: true },
  },
} as const;

// ==============================================
// GET - Chi tiết Assignment
// ==============================================

export async function GET(
  request: NextRequest,
  context: Context
) {
  const teacherId = await getTeacherId(request);

  if (teacherId instanceof NextResponse) {
    return teacherId;
  }

  try {
    const { id } = await context.params;

    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        teacherId,
      },
      include: assignmentInclude,
    });

    if (!assignment) {
      return NextResponse.json(
        { message: "Không tìm thấy bài giao" },
        { status: 404 }
      );
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("GET ASSIGNMENT DETAIL ERROR:", error);

    return NextResponse.json(
      { message: "Không thể tải chi tiết bài giao" },
      { status: 500 }
    );
  }
}

// ==============================================
// PUT - Cập nhật Assignment
// ==============================================

export async function PUT(
  request: NextRequest,
  context: Context
) {
  const teacherId = await getTeacherId(request);

  if (teacherId instanceof NextResponse) {
    return teacherId;
  }

  try {
    const { id } = await context.params;

    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        teacherId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { message: "Không tìm thấy bài giao" },
        { status: 404 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "JSON không hợp lệ" },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { message: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;

    const allowedFields = [
      "title",
      "description",
      "startAt",
      "dueAt",
    ];

    if (
      Object.keys(input).some(
        (key) => !allowedFields.includes(key)
      )
    ) {
      return NextResponse.json(
        { message: "Có trường dữ liệu không được phép sửa" },
        { status: 400 }
      );
    }

    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        { message: "Không có dữ liệu cập nhật" },
        { status: 400 }
      );
    }

    for (const field of allowedFields) {
      if (
        input[field] !== undefined &&
        input[field] !== null &&
        typeof input[field] !== "string"
      ) {
        return NextResponse.json(
          { message: `Trường ${field} không hợp lệ` },
          { status: 400 }
        );
      }
    }

    const title =
      input.title === undefined
        ? assignment.title
        : typeof input.title === "string"
          ? input.title.trim() || null
          : null;

    const description =
      input.description === undefined
        ? assignment.description
        : typeof input.description === "string"
          ? input.description.trim() || null
          : null;

    const startAt =
      input.startAt === undefined
        ? assignment.startAt
        : typeof input.startAt === "string" &&
            input.startAt.trim()
          ? new Date(input.startAt)
          : assignment.startAt;

    const dueAt =
      input.dueAt === undefined
        ? assignment.dueAt
        : typeof input.dueAt === "string" &&
            input.dueAt.trim()
          ? new Date(input.dueAt)
          : null;

    if (
      Number.isNaN(startAt.getTime()) ||
      (dueAt && Number.isNaN(dueAt.getTime()))
    ) {
      return NextResponse.json(
        { message: "Ngày không hợp lệ" },
        { status: 400 }
      );
    }

    if (dueAt && dueAt <= startAt) {
      return NextResponse.json(
        { message: "Hạn nộp phải sau ngày bắt đầu" },
        { status: 400 }
      );
    }

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        title,
        description,
        startAt,
        dueAt,
      },
      include: assignmentInclude,
    });

    return NextResponse.json({
      message: "Cập nhật bài giao thành công",
      assignment: updated,
    });
  } catch (error) {
    console.error("UPDATE ASSIGNMENT ERROR:", error);

    return NextResponse.json(
      { message: "Không thể cập nhật bài giao" },
      { status: 500 }
    );
  }
}

// ==============================================
// DELETE - Xóa Assignment
// ==============================================

export async function DELETE(
  request: NextRequest,
  context: Context
) {
  const teacherId = await getTeacherId(request);

  if (teacherId instanceof NextResponse) {
    return teacherId;
  }

  try {
    const { id } = await context.params;

    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        teacherId,
      },
      select: {
        id: true,
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { message: "Không tìm thấy bài giao" },
        { status: 404 }
      );
    }

    if (assignment._count.submissions > 0) {
      return NextResponse.json(
        {
          message:
            "Không thể xóa bài giao đã có học sinh làm bài.",
        },
        { status: 409 }
      );
    }

    await prisma.assignment.delete({
      where: { id: assignment.id },
    });

    return NextResponse.json({
      message: "Xóa bài giao thành công",
    });
  } catch (error) {
    console.error("DELETE ASSIGNMENT ERROR:", error);

    return NextResponse.json(
      { message: "Không thể xóa bài giao" },
      { status: 500 }
    );
  }
}
