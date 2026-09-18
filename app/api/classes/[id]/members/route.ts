import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

// ============================================
// POST - ADD STUDENT TO CLASS
// ============================================
export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    // ----------------------------------------
    // 1. Check login
    // ----------------------------------------
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

    // ----------------------------------------
    // 2. Verify JWT
    // ----------------------------------------
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        {
          message: "Bạn không có quyền thực hiện thao tác này",
        },
        {
          status: 403,
        }
      );
    }

    const teacherId = payload.id as string;

    // ----------------------------------------
    // 3. Get class ID
    // ----------------------------------------
    const { id: classId } = await context.params;

    if (!classId) {
      return NextResponse.json(
        {
          message: "Thiếu classId",
        },
        {
          status: 400,
        }
      );
    }

    // ----------------------------------------
    // 4. Read request body
    // ----------------------------------------
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          message: "Vui lòng nhập email học sinh",
        },
        {
          status: 400,
        }
      );
    }

    // ----------------------------------------
    // 5. Check class belongs to teacher
    // ----------------------------------------
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId,
      },
    });

    if (!classData) {
      return NextResponse.json(
        {
          message: "Không tìm thấy lớp hoặc bạn không có quyền với lớp này",
        },
        {
          status: 404,
        }
      );
    }

    // ----------------------------------------
    // 6. Find student by email
    // ----------------------------------------
    const student = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!student) {
      return NextResponse.json(
        {
          message: "Không tìm thấy tài khoản với email này",
        },
        {
          status: 404,
        }
      );
    }

    // ----------------------------------------
    // 7. Check role
    // ----------------------------------------
    if (student.role !== "STUDENT") {
      return NextResponse.json(
        {
          message: "Tài khoản này không phải học sinh",
        },
        {
          status: 400,
        }
      );
    }

    // ----------------------------------------
    // 8. Check existing member
    // ----------------------------------------
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
        {
          message: "Học sinh này đã ở trong lớp",
        },
        {
          status: 409,
        }
      );
    }

    // ----------------------------------------
    // 9. Add student
    // ----------------------------------------
    const member = await prisma.classMember.create({
      data: {
        classId,
        studentId: student.id,
      },

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
    });

    // ----------------------------------------
    // 10. Return success
    // ----------------------------------------
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
      {
        message: "Không thể thêm học sinh",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================
// DELETE - REMOVE STUDENT FROM CLASS
// ============================================
export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    // ----------------------------------------
    // 1. Check login
    // ----------------------------------------
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

    // ----------------------------------------
    // 2. Verify JWT
    // ----------------------------------------
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "TEACHER") {
      return NextResponse.json(
        {
          message: "Bạn không có quyền thực hiện thao tác này",
        },
        {
          status: 403,
        }
      );
    }

    const teacherId = payload.id as string;

    // ----------------------------------------
    // 3. Get class ID
    // ----------------------------------------
    const { id: classId } = await context.params;

    if (!classId) {
      return NextResponse.json(
        {
          message: "Thiếu classId",
        },
        {
          status: 400,
        }
      );
    }

    // ----------------------------------------
    // 4. Read body
    // ----------------------------------------
    const body = await request.json();

    const studentId = body.studentId;

    if (!studentId) {
      return NextResponse.json(
        {
          message: "Thiếu studentId",
        },
        {
          status: 400,
        }
      );
    }

    // ----------------------------------------
    // 5. Check class belongs to teacher
    // ----------------------------------------
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId,
      },
    });

    if (!classData) {
      return NextResponse.json(
        {
          message: "Không tìm thấy lớp hoặc bạn không có quyền với lớp này",
        },
        {
          status: 404,
        }
      );
    }

    // ----------------------------------------
    // 6. Check member exists
    // ----------------------------------------
    const member = await prisma.classMember.findUnique({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        {
          message: "Học sinh không ở trong lớp này",
        },
        {
          status: 404,
        }
      );
    }

    // ----------------------------------------
    // 7. Remove student
    // ----------------------------------------
    await prisma.classMember.delete({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
    });

    // ----------------------------------------
    // 8. Return success
    // ----------------------------------------
    return NextResponse.json({
      message: "Xóa học sinh khỏi lớp thành công",
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