import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    let teacherId: string;
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== "TEACHER") {
        return NextResponse.json(
          { message: "Không có quyền truy cập" },
          { status: 403 }
        );
      }
      if (typeof payload.id !== "string" || !payload.id) {
        return NextResponse.json(
          { message: "Phiên đăng nhập không hợp lệ" },
          { status: 401 }
        );
      }
      teacherId = payload.id;
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    const { id: questionId } = await context.params;
    const question = await prisma.question.findFirst({
      where: { id: questionId, exercise: { teacherId } },
      select: { id: true },
    });
    if (!question) {
      return NextResponse.json(
        { message: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }

    const options = await prisma.questionOption.findMany({
      where: { questionId },
      orderBy: { label: "asc" },
    });
    return NextResponse.json(options);
  } catch (error) {
    console.error("GET QUESTION OPTIONS ERROR:", error);
    return NextResponse.json(
      { message: "Không thể tải danh sách đáp án" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: Context
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
    const { id: questionId } = await context.params;

    // Lấy question + exercise
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        exercise: {
          teacherId,
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { message: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const {
      label,
      content,
      isCorrect,
    } = body;

    if (!label || !content) {
      return NextResponse.json(
        { message: "label và content là bắt buộc" },
        { status: 400 }
      );
    }

    const option = await prisma.questionOption.create({
      data: {
        questionId,
        label,
        content,
        isCorrect: isCorrect ?? false,
      },
    });

    return NextResponse.json(option, { status: 201 });
  } catch (error) {
    console.error("POST OPTION ERROR:", error);

    return NextResponse.json(
      { message: "Lỗi server" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: Context
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    let teacherId: string;
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== "TEACHER") {
        return NextResponse.json(
          { message: "Không có quyền truy cập" },
          { status: 403 }
        );
      }
      if (typeof payload.id !== "string" || !payload.id) {
        return NextResponse.json(
          { message: "Phiên đăng nhập không hợp lệ" },
          { status: 401 }
        );
      }
      teacherId = payload.id;
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    const { id: questionId } = await context.params;
    const question = await prisma.question.findFirst({
      where: { id: questionId, exercise: { teacherId } },
      select: { id: true },
    });
    if (!question) {
      return NextResponse.json(
        { message: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { message: "Dữ liệu đáp án không hợp lệ" },
        { status: 400 }
      );
    }
    const input = body as Record<string, unknown>;
    const { optionId, label, content, isCorrect } = input;
    if (
      typeof optionId !== "string" || !optionId ||
      typeof label !== "string" || !["A", "B", "C", "D"].includes(label) ||
      typeof content !== "string" || !content.trim() || content.trim().length > 1000 ||
      typeof isCorrect !== "boolean"
    ) {
      return NextResponse.json(
        { message: "Nhãn, nội dung hoặc trạng thái đáp án không hợp lệ" },
        { status: 400 }
      );
    }

    const existingOption = await prisma.questionOption.findFirst({
      where: { id: optionId, questionId },
      select: { id: true },
    });
    if (!existingOption) {
      return NextResponse.json(
        { message: "Không tìm thấy đáp án" },
        { status: 404 }
      );
    }

    const duplicateLabel = await prisma.questionOption.findFirst({
      where: { questionId, label, NOT: { id: optionId } },
      select: { id: true },
    });
    if (duplicateLabel) {
      return NextResponse.json(
        { message: "Nhãn đáp án đã được sử dụng" },
        { status: 409 }
      );
    }

    const option = await prisma.$transaction(async (tx) => {
      if (isCorrect) {
        await tx.questionOption.updateMany({
          where: { questionId, NOT: { id: optionId } },
          data: { isCorrect: false },
        });
      }
      return tx.questionOption.update({
        where: { id: optionId },
        data: { label, content: content.trim(), isCorrect },
      });
    });

    return NextResponse.json(option);
  } catch (error) {
    console.error("UPDATE QUESTION OPTION ERROR:", error);
    return NextResponse.json(
      { message: "Không thể cập nhật đáp án" },
      { status: 500 }
    );
  }
}
