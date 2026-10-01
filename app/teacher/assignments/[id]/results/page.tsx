"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Student = {
  id: string;
  name: string;
  email: string;
};

type Result = {
  id: string;
  student: Student;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string | null;
};

type AssignmentData = {
  id: string;
  title: string | null;
  exercise: {
    id: string;
    title: string;
    questions: {
      id: string;
    }[];
  };
  class: {
    id: string;
    name: string;
    code: string;
    grade: number;
  };
};

export default function AssignmentResultsPage() {
  const params = useParams();
  const router = useRouter();

  const assignmentId = params.id as string;

  const [assignment, setAssignment] =
    useState<AssignmentData | null>(null);

  const [results, setResults] = useState<Result[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/teacher/assignments/${assignmentId}/submissions`
        );

        const text = await response.text();

        const data = text ? JSON.parse(text) : {};

        if (!response.ok) {
          throw new Error(
            data.message || "Không thể tải kết quả"
          );
        }

        setAssignment(data.assignment);
        setResults(data.results || []);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra"
        );
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId) {
      loadResults();
    }
  }, [assignmentId]);

  const formatDate = (date: string | null) => {
    if (!date) {
      return "Chưa nộp";
    }

    return new Date(date).toLocaleString("vi-VN");
  };

  if (loading) {
    return (
      <div className="p-6">
        Đang tải kết quả...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6">
        Không tìm thấy bài tập.
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-blue-600 hover:underline"
        >
          ← Quay lại
        </button>

        <h1 className="text-2xl font-bold">
          Kết quả bài tập
        </h1>

        <div className="mt-2 text-gray-600">
          <p>
            <strong>Bài:</strong>{" "}
            {assignment.title ||
              assignment.exercise.title}
          </p>

          <p>
            <strong>Lớp:</strong>{" "}
            {assignment.class.name}
          </p>

          <p>
            <strong>Mã lớp:</strong>{" "}
            {assignment.class.code}
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Tổng số học sinh đã nộp
          </p>

          <p className="mt-2 text-3xl font-bold">
            {results.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Số câu hỏi
          </p>

          <p className="mt-2 text-3xl font-bold">
            {assignment.exercise.questions.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Điểm trung bình
          </p>

          <p className="mt-2 text-3xl font-bold">
            {results.length > 0
              ? (
                  results.reduce(
                    (sum, item) => sum + item.score,
                    0
                  ) / results.length
                ).toFixed(2)
              : "0.00"}
          </p>
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
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
                Đúng
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
                  Chưa có học sinh nào nộp bài.
                </td>
              </tr>
            ) : (
              results.map((result, index) => (
                <tr
                  key={result.id}
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
                    {result.correctCount}/
                    {result.totalQuestions}
                  </td>

                  <td className="px-4 py-3 text-center font-bold">
                    {result.score}/10
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(result.submittedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}