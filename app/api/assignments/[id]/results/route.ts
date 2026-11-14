
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

type Context = {
  params: Promise<{
    id: string;
  }>;
};

// ======================================================
// GET - Giáo viên xem kết quả học sinh
// ======================================================

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    // ==================================================
    // 1. Kiểm tra đăng nhập
    // ==================================================

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // ==================================================
    // 2. Xác thực JWT và quyền Teacher
    // ==================================================

    let teacherId: string;

    try {
      const { payload } = await jwtVerify(
        token,
        secret
      );

      if (
        payload.role !== "TEACHER" ||
        typeof payload.id !== "string" ||
        !payload.id
      ) {
        return NextResponse.json(
          { error: "Không có quyền truy cập" },
          { status: 403 }
        );
      }

      teacherId = payload.id;
    } catch {
      return NextResponse.json(
        {
          error:
            "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        },
        { status: 401 }
      );
    }

    // ==================================================
    // 3. Lấy assignment ID
    // ==================================================

    const { id: assignmentId } =
      await context.params;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Thiếu assignment ID" },
        { status: 400 }
      );
    }

    // ==================================================
    // 4. Kiểm tra Assignment thuộc Teacher
    // ==================================================

    const assignment =
      await prisma.assignment.findFirst({
        where: {
          id: assignmentId,
          teacherId,
        },

        include: {
          exercise: {
            select: {
              id: true,
              title: true,
              skill: true,
              difficulty: true,

              questions: {
                select: {
                  id: true,
                  type: true,
                },
              },
            },
          },

          class: {
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
                    },
                  },
                },
              },
            },
          },

          submissions: {
            select: {
              id: true,
              studentId: true,
              score: true,
              submittedAt: true,
              createdAt: true,

              answers: {
                select: {
                  questionId: true,
                  isCorrect: true,
                  score: true,
                },
              },

              speakingRecords: {
                select: {
                  id: true,
                  questionId: true,
                  transcript: true,
                  grammarScore: true,
                  vocabularyScore: true,
                  pronunciationScore: true,
                  fluencyScore: true,
                },
              },
            },
          },
        },
      });

    if (!assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy assignment" },
        { status: 404 }
      );
    }

    // ==================================================
    // 5. Thông tin bài tập
    // ==================================================

    const skill = assignment.exercise.skill;

    const isSpeaking = skill === "SPEAKING";

    const totalQuestions =
      assignment.exercise.questions.length;

    // ==================================================
    // 6. Tạo Map Submission theo Student
    // ==================================================

    const submissionMap = new Map(
      assignment.submissions.map(
        (submission) => [
          submission.studentId,
          submission,
        ]
      )
    );

    // ==================================================
    // 7. Danh sách kết quả tất cả học sinh
    // ==================================================

    const results =
      assignment.class.members.map((member) => {
        const student = member.student;

        const submission =
          submissionMap.get(student.id);

        // Quan trọng:
        // Có Submission chưa đồng nghĩa đã nộp.
        const hasSubmitted =
          submission?.submittedAt != null;

        // Chỉ hiển thị điểm khi đã nộp.
        const score = hasSubmitted
          ? (submission?.score ?? null)
          : null;

        // Bài chưa nộp không có submissionId
        // để tránh mở chi tiết bản nháp.
        const submissionId =
          hasSubmitted && submission
            ? submission.id
            : null;

        const correctCount =
          hasSubmitted && !isSpeaking && submission
            ? submission.answers.filter(
                (answer) =>
                  answer.isCorrect === true
              ).length
            : null;

        const gradedQuestions =
          hasSubmitted && submission
            ? submission.answers.filter(
                (answer) =>
                  answer.score !== null
              ).length
            : 0;

        const speakingRecordCount =
          hasSubmitted && submission && isSpeaking
            ? submission.speakingRecords.length
            : 0;

        const transcriptCount =
          hasSubmitted && submission && isSpeaking
            ? submission.speakingRecords.filter(
                (record) =>
                  Boolean(
                    record.transcript?.trim()
                  )
              ).length
            : 0;

        const pronunciationGradedCount =
          hasSubmitted && submission && isSpeaking
            ? submission.speakingRecords.filter(
                (record) =>
                  record.pronunciationScore !== null &&
                  record.fluencyScore !== null
              ).length
            : 0;

        let gradingStatus:
          | "NOT_SUBMITTED"
          | "PENDING"
          | "COMPLETED";

        if (!hasSubmitted) {
          gradingStatus = "NOT_SUBMITTED";
        } else if (score === null) {
          gradingStatus = "PENDING";
        } else {
          gradingStatus = "COMPLETED";
        }

        return {
          student,

          // Giữ nguyên cấu trúc trang Results.
          status: hasSubmitted
            ? ("SUBMITTED" as const)
            : ("NOT_SUBMITTED" as const),

          score,

          submittedAt: hasSubmitted
            ? submission!.submittedAt
            : null,

          submissionId,

          // Các trường bổ sung
          gradingStatus,

          correctCount,
          gradedQuestions,
          totalQuestions,

          speaking: isSpeaking
            ? {
                recordCount:
                  speakingRecordCount,

                transcriptCount,

                pronunciationGradedCount,

                contentGraded:
                  hasSubmitted &&
                  score !== null,
              }
            : null,
        };
      });

    // ==================================================
    // 8. Thống kê lớp
    // ==================================================

    const submittedResults = results.filter(
      (result) =>
        result.status === "SUBMITTED"
    );

    const notSubmittedResults = results.filter(
      (result) =>
        result.status === "NOT_SUBMITTED"
    );

    const gradedResults =
      submittedResults.filter(
        (result) =>
          result.score !== null
      );

    const pendingResults =
      submittedResults.filter(
        (result) =>
          result.score === null
      );

    // Chỉ lấy điểm của bài đã chấm.
    const scores = gradedResults
      .map((result) => result.score)
      .filter(
        (score): score is number =>
          score !== null
      );

    const averageScore =
      scores.length > 0
        ? Number(
            (
              scores.reduce(
                (sum, score) => sum + score,
                0
              ) / scores.length
            ).toFixed(2)
          )
        : null;

    // ==================================================
    // 9. Response
    // ==================================================

    return NextResponse.json({
      assignment: {
        id: assignment.id,

        title: assignment.title,

        description:
          assignment.description,

        exercise: {
          id: assignment.exercise.id,
          title: assignment.exercise.title,
          skill: assignment.exercise.skill,
          difficulty:
            assignment.exercise.difficulty,
        },

        class: {
          id: assignment.class.id,
          name: assignment.class.name,
          code: assignment.class.code,
          grade: assignment.class.grade,
        },

        startAt: assignment.startAt,
        dueAt: assignment.dueAt,
      },

      statistics: {
        totalStudents: results.length,

        submittedStudents:
          submittedResults.length,

        notSubmittedStudents:
          notSubmittedResults.length,

        gradedStudents:
          gradedResults.length,

        pendingGradingStudents:
          pendingResults.length,

        // null nếu chưa có bài nào được chấm.
        averageScore,
      },

      results,
    });
  } catch (error) {
    console.error(
      "GET /api/assignments/[id]/results ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Lỗi server khi lấy kết quả học sinh",
      },
      {
        status: 500,
      }
    );
  }
}
