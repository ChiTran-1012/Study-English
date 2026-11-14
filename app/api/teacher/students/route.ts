
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

    let teacherId: string;

    try {
      const { payload } = await jwtVerify(token, secret);

      if (
        payload.role !== "TEACHER" ||
        typeof payload.id !== "string"
      ) {
        return NextResponse.json(
          { message: "Không có quyền truy cập" },
          { status: 403 }
        );
      }

      teacherId = payload.id;
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    // 1. Lấy lớp và học sinh của giáo viên
    const classes = await prisma.class.findMany({
      where: { teacherId },
      select: {
        id: true,
        name: true,
        code: true,
        grade: true,
        members: {
          select: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 2. Gom học sinh, tránh trùng khi thuộc nhiều lớp
    const studentMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        createdAt: Date;
        classes: {
          id: string;
          name: string;
          code: string;
          grade: number;
        }[];
      }
    >();

    for (const classItem of classes) {
      for (const member of classItem.members) {
        const student = member.student;

        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            id: student.id,
            name: student.name,
            email: student.email,
            createdAt: student.createdAt,
            classes: [],
          });
        }

        studentMap.get(student.id)!.classes.push({
          id: classItem.id,
          name: classItem.name,
          code: classItem.code,
          grade: classItem.grade,
        });
      }
    }

    const studentIds = [...studentMap.keys()];
    const classIds = classes.map((item) => item.id);

    // 3. Lấy bài nộp của học sinh trong các lớp này
    const submissions =
      studentIds.length > 0 && classIds.length > 0
        ? await prisma.submission.findMany({
            where: {
              studentId: { in: studentIds },
              submittedAt: { not: null },
              assignment: {
                classId: { in: classIds },
                teacherId,
              },
            },
            select: {
              studentId: true,
              score: true,
              assignmentId: true,
            },
          })
        : [];

    // 4. Thống kê theo học sinh
    const students = [...studentMap.values()].map((student) => {
      const studentSubmissions = submissions.filter(
        (submission) => submission.studentId === student.id
      );

      const scores = studentSubmissions
        .map((submission) => submission.score)
        .filter((score): score is number => score !== null);

      const averageScore =
        scores.length > 0
          ? Math.round(
              (scores.reduce((sum, score) => sum + score, 0) /
                scores.length) *
                100
            ) / 100
          : null;

      return {
        ...student,
        submittedCount: studentSubmissions.length,
        gradedCount: scores.length,
        awaitingGrading:
          studentSubmissions.length - scores.length,
        averageScore,
      };
    });

    students.sort((a, b) =>
      a.name.localeCompare(b.name, "vi")
    );

    return NextResponse.json(
      {
        statistics: {
          totalStudents: students.length,
          totalClasses: classes.length,
          totalSubmissions: submissions.length,
        },
        classes: classes.map((item) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          grade: item.grade,
        })),
        students,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("TEACHER STUDENTS ERROR:", error);

    return NextResponse.json(
      { message: "Không thể tải danh sách học sinh" },
      { status: 500 }
    );
  }
}
