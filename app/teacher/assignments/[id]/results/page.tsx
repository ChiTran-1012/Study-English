"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type StudentResult = {
  student: {
    id: string;
    name: string;
    email: string;
  };

  status: "SUBMITTED" | "NOT_SUBMITTED";

  score: number | null;

  submittedAt: string | null;

  submissionId: string | null;
};

type AssignmentResult = {
  assignment: {
    id: string;
    title: string | null;
    description: string | null;

    exercise: {
      id: string;
      title: string;
      skill: string;
      difficulty: string;
    };

    class: {
      id: string;
      name: string;
      code: string;
      grade: number;
    } | null;

    startAt: string;
    dueAt: string | null;
  };

  statistics: {
    totalStudents: number;
    submittedStudents: number;
    notSubmittedStudents: number;
    averageScore: number;
  };

  results: StudentResult[];
};

export default function AssignmentResultsPage() {
  const params = useParams();

  const id = params.id as string;

  const [data, setData] =
    useState<AssignmentResult | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ====================================================
  // Load results
  // ====================================================

  useEffect(() => {
    if (!id) return;

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/assignments/${id}/results`
        );

        const text = await response.text();

        console.log(
          "RESULT STATUS:",
          response.status
        );

        console.log(
          "RESULT RESPONSE:",
          text
        );

        const result = text
          ? JSON.parse(text)
          : null;

        if (!response.ok) {
          throw new Error(
            result?.error ||
              `API lỗi ${response.status}`
          );
        }

        setData(result);
      } catch (error) {
        console.error(
          "LOAD RESULTS ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Không thể tải kết quả"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [id]);

  // ====================================================
  // Loading
  // ====================================================

  if (loading) {
    return (
      <div className="p-6">
        <p>Đang tải kết quả...</p>
      </div>
    );
  }

  // ====================================================
  // Error
  // ====================================================

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        Không có dữ liệu.
      </div>
    );
  }

  const {
    assignment,
    statistics,
    results,
  } = data;

  // ====================================================
  // Format date
  // ====================================================

  const formatDate = (
    date: string | null
  ) => {
    if (!date) return "—";

    return new Date(date).toLocaleString(
      "vi-VN"
    );
  };

  // ====================================================
  // UI
  // ====================================================

  return (
    <div className="p-6 space-y-6">
      {/* Header */}

      <div>
        <a
          href="/teacher/assignments"
          className="text-blue-600 hover:underline"
        >
          ← Quay lại Assignment
        </a>

        <h1 className="mt-3 text-2xl font-bold">
          {assignment.title ||
            assignment.exercise.title}
        </h1>

        {assignment.description && (
          <p className="mt-1 text-gray-600">
            {assignment.description}
          </p>
        )}
      </div>

      {/* Assignment information */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">
            Bài tập
          </p>

          <p className="mt-1 font-semibold">
            {assignment.exercise.title}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">
            Lớp
          </p>

          <p className="mt-1 font-semibold">
            {assignment.class?.name || "—"}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">
            Kỹ năng
          </p>

          <p className="mt-1 font-semibold">
            {assignment.exercise.skill}
          </p>
        </div>
      </div>

      {/* Statistics */}

      <div>
        <h2 className="mb-4 text-xl font-bold">
          Thống kê
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total */}

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">
              Tổng học sinh
            </p>

            <p className="mt-2 text-3xl font-bold">
              {statistics.totalStudents}
            </p>
          </div>

          {/* Submitted */}

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">
              Đã nộp
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {statistics.submittedStudents}
            </p>
          </div>

          {/* Not submitted */}

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">
              Chưa nộp
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-600">
              {statistics.notSubmittedStudents}
            </p>
          </div>

          {/* Average */}

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">
              Điểm trung bình
            </p>

            <p className="mt-2 text-3xl font-bold">
              {statistics.averageScore}
            </p>
          </div>
        </div>
      </div>

      {/* Student results */}

      <div>
        <h2 className="mb-4 text-xl font-bold">
          Kết quả học sinh
        </h2>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  #
                </th>

                <th className="px-4 py-3 text-left">
                  Học sinh
                </th>

                <th className="px-4 py-3 text-left">
                  Email
                </th>

                <th className="px-4 py-3 text-center">
                  Trạng thái
                </th>

                <th className="px-4 py-3 text-center">
                  Điểm
                </th>

                <th className="px-4 py-3 text-left">
                  Thời gian nộp
                </th>
              </tr>
            </thead>

            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Chưa có học sinh trong lớp.
                  </td>
                </tr>
              ) : (
                results.map(
                  (result, index) => (
                    <tr
                      key={result.student.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {result.student.name}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {result.student.email}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {result.status ===
                        "SUBMITTED" ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                            Đã nộp
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                            Chưa nộp
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center font-semibold">
                        {result.score !== null
                          ? result.score
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(
                          result.submittedAt
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}