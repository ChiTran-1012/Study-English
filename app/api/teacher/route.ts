
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

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

    let studentId: string;

    try {
      const { payload } = await jwtVerify(token, secret);

      if (
        payload.role !== "STUDENT" ||
        typeof payload.id !== "string"
      ) {
        return NextResponse.json(
          { message: "Không có quyền truy cập" },
          { status: 403 }
        );
      }

      studentId = payload.id;
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    // Lấy lớp học sinh đang tham gia
    const memberships = await prisma.classMember.findMany({
      where: { studentId },
      select: {
        class: {
          select: {
            grade: true,
            teacherId: true,
          },
        },
      },
    });

    const teacherIds = [
      ...new Set(
        memberships.map((member) => member.class.teacherId)
      ),
    ];

    const grades = [
      ...new Set(
        memberships.map((member) => member.class.grade)
      ),
    ];

    // Bài tập thuộc giáo viên của các lớp đã tham gia
    // Chỉ lấy bài có ít nhất một câu hỏi
    const exercises = teacherIds.length
      ? await prisma.exercise.findMany({
          where: {
            teacherId: { in: teacherIds },
            questions: { some: {} },
          },
          select: {
            id: true,
            title: true,
            description: true,
            skill: true,
            difficulty: true,
            source: true,
            createdAt: true,
            _count: {
              select: {
                questions: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        })
      : [];

    return NextResponse.json(
      {
        studentGrades: grades,
        total: exercises.length,
        exercises: exercises.map((exercise) => ({
          id: exercise.id,
          title: exercise.title,
          description: exercise.description,
          skill: exercise.skill,
          difficulty: exercise.difficulty,
          source: exercise.source,
          questionCount: exercise._count.questions,
          createdAt: exercise.createdAt,
        })),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("STUDENT PRACTICE ERROR:", error);

    return NextResponse.json(
      { message: "Không thể tải bài luyện tập" },
      { status: 500 }
    );
  }
}
