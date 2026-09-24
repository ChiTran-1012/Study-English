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

// ======================================================
// GET - Lấy thông tin Question
// ======================================================

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    // -------------------------
    // 1. Kiểm tra đăng nhập
    // -------------------------

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    // -------------------------
    // 2. Kiểm tra JWT
    // -------------------------

    const { payload } = await jwtVerify(
      token,
      secret
    );

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        {
          message: "Không có quyền truy cập",
        },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    // -------------------------
    // 3. Lấy Question ID
    // -------------------------

    const { id } = await context.params;

    // -------------------------
    // 4. Tìm Question
    // -------------------------

    const question =
      await prisma.question.findFirst({
        where: {
          id,
          exercise: {
            teacherId,
          },
        },
        include: {
          options: {
            orderBy: {
              label: "asc",
            },
          },
        },
      });

    if (!question) {
      return NextResponse.json(
        {
          message: "Không tìm thấy câu hỏi",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error(
      "GET QUESTION ERROR:",
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
      { status: 500 }
    );
  }
}

// ======================================================
// PUT - Cập nhật Question
// ======================================================

export async function PUT(
  request: NextRequest,
  context: Context
) {
  try {
    // -------------------------
    // 1. Kiểm tra đăng nhập
    // -------------------------

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    // -------------------------
    // 2. Kiểm tra JWT
    // -------------------------

    const { payload } = await jwtVerify(
      token,
      secret
    );

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        {
          message: "Không có quyền truy cập",
        },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    // -------------------------
    // 3. Lấy Question ID
    // -------------------------

    const { id } = await context.params;

    // -------------------------
    // 4. Đọc body
    // -------------------------

    const body = await request.json();

    const {
      content,
      type,
      order,
      explanation,
      correctAnswer,
    } = body;

    // ==================================================
    // VALIDATION QUESTION
    // ==================================================

    // Content bắt buộc
    if (
      typeof content !== "string" ||
      !content.trim()
    ) {
      return NextResponse.json(
        {
          message:
            "Nội dung câu hỏi không được để trống",
        },
        { status: 400 }
      );
    }

    // Không cho content quá dài
    if (content.trim().length > 2000) {
      return NextResponse.json(
        {
          message:
            "Nội dung câu hỏi không được vượt quá 2000 ký tự",
        },
        { status: 400 }
      );
    }

    // Type bắt buộc
    const allowedTypes = [
      "MULTIPLE_CHOICE",
      "TRUE_FALSE",
      "FILL_BLANK",
      "REORDER",
      "MATCHING",
      "LISTENING",
      "SPEAKING",
      "WRITING",
    ];

    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        {
          message:
            "Loại câu hỏi không hợp lệ",
        },
        { status: 400 }
      );
    }

    // Order phải là số nguyên >= 1
    const questionOrder = Number(order);

    if (
      !Number.isInteger(questionOrder) ||
      questionOrder < 1
    ) {
      return NextResponse.json(
        {
          message:
            "Thứ tự câu hỏi phải là số nguyên lớn hơn hoặc bằng 1",
        },
        { status: 400 }
      );
    }

    // Explanation nếu có phải là string
    if (
      explanation !== undefined &&
      explanation !== null &&
      typeof explanation !== "string"
    ) {
      return NextResponse.json(
        {
          message:
            "Giải thích câu hỏi không hợp lệ",
        },
        { status: 400 }
      );
    }

    // Correct Answer nếu có phải là string
    if (
      correctAnswer !== undefined &&
      correctAnswer !== null &&
      typeof correctAnswer !== "string"
    ) {
      return NextResponse.json(
        {
          message:
            "Đáp án đúng không hợp lệ",
        },
        { status: 400 }
      );
    }

    // -------------------------
    // 5. Kiểm tra ownership
    // -------------------------

    const question =
      await prisma.question.findFirst({
        where: {
          id,
          exercise: {
            teacherId,
          },
        },
      });

    if (!question) {
      return NextResponse.json(
        {
          message:
            "Không tìm thấy câu hỏi hoặc bạn không có quyền",
        },
        { status: 404 }
      );
    }

    // -------------------------
    // 6. Kiểm tra order trùng
    // -------------------------

    const duplicateOrder =
      await prisma.question.findFirst({
        where: {
          exerciseId: question.exerciseId,
          order: questionOrder,
          NOT: {
            id,
          },
        },
      });

    if (duplicateOrder) {
      return NextResponse.json(
        {
          message:
            `Câu hỏi số ${questionOrder} đã tồn tại trong bài tập này`,
        },
        { status: 400 }
      );
    }

    // -------------------------
    // 7. Update
    // -------------------------

    const updatedQuestion =
      await prisma.question.update({
        where: {
          id,
        },
        data: {
          content: content.trim(),
          type,
          order: questionOrder,
          explanation:
            typeof explanation === "string" &&
            explanation.trim()
              ? explanation.trim()
              : null,
          correctAnswer:
            typeof correctAnswer === "string" &&
            correctAnswer.trim()
              ? correctAnswer.trim()
              : null,
        },
        include: {
          options: {
            orderBy: {
              label: "asc",
            },
          },
        },
      });

    return NextResponse.json(
      updatedQuestion
    );
  } catch (error) {
    console.error(
      "UPDATE QUESTION ERROR:",
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
      { status: 500 }
    );
  }
}

// ======================================================
// DELETE - Xóa Question
// ======================================================

export async function DELETE(
  request: NextRequest,
  context: Context
) {
  try {
    // -------------------------
    // 1. Kiểm tra đăng nhập
    // -------------------------

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    // -------------------------
    // 2. Kiểm tra JWT
    // -------------------------

    const { payload } = await jwtVerify(
      token,
      secret
    );

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        {
          message: "Không có quyền truy cập",
        },
        { status: 403 }
      );
    }

    const teacherId = payload.id as string;

    // -------------------------
    // 3. Lấy ID
    // -------------------------

    const { id } = await context.params;

    // -------------------------
    // 4. Kiểm tra ownership
    // -------------------------

    const question =
      await prisma.question.findFirst({
        where: {
          id,
          exercise: {
            teacherId,
          },
        },
      });

    if (!question) {
      return NextResponse.json(
        {
          message:
            "Không tìm thấy câu hỏi hoặc bạn không có quyền",
        },
        { status: 404 }
      );
    }

    // -------------------------
    // 5. Xóa
    // -------------------------

    await prisma.question.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Xóa câu hỏi thành công",
    });
  } catch (error) {
    console.error(
      "DELETE QUESTION ERROR:",
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
      { status: 500 }
    );
  }
}