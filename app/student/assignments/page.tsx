"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Assignment = {
  id: string;
  title: string | null;
  description: string | null;
  startAt: string;
  dueAt: string | null;

  exercise: {
    id: string;
    title: string;
    description: string | null;
    skill: string;
    difficulty: string;
  };

  class: {
    id: string;
    name: string;
    code: string;
    grade: number;
  };

  teacher: {
    id: string;
    name: string;
  };
};

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<
    Assignment[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAssignments() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/student/assignments"
        );

        const text = await response.text();

        console.log(
          "GET /api/student/assignments:",
          response.status
        );

        console.log(
          "Response:",
          text
        );

        if (!response.ok) {
          throw new Error(
            text ||
              "Không thể tải bài tập"
          );
        }

        const data = text
          ? JSON.parse(text)
          : [];

        setAssignments(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          "LOAD STUDENT ASSIGNMENTS ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra"
        );
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, []);

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Không có";
    }

    return new Date(date).toLocaleString(
      "vi-VN"
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>
          Đang tải bài tập...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Bài tập được giao
        </h1>

        <p className="mt-1 text-gray-500">
          Danh sách bài tập giáo viên giao cho bạn.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Empty */}
      {!error &&
        assignments.length === 0 && (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-gray-500">
              Hiện tại bạn chưa có bài tập nào.
            </p>
          </div>
        )}

      {/* Assignment list */}
      {assignments.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {assignments.map(
            (assignment) => (
              <div
                key={assignment.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    {assignment.title ||
                      assignment.exercise.title}
                  </h2>

                  {assignment.description && (
                    <p className="mt-1 text-sm text-gray-500">
                      {assignment.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Exercise */}
                  <div>
                    <p className="text-sm text-gray-500">
                      Bài tập
                    </p>

                    <p className="font-medium">
                      {assignment.exercise.title}
                    </p>
                  </div>

                  {/* Skill */}
                  <div>
                    <p className="text-sm text-gray-500">
                      Kỹ năng
                    </p>

                    <p className="font-medium">
                      {assignment.exercise.skill}
                    </p>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <p className="text-sm text-gray-500">
                      Độ khó
                    </p>

                    <p className="font-medium">
                      {assignment.exercise.difficulty}
                    </p>
                  </div>

                  {/* Class */}
                  <div>
                    <p className="text-sm text-gray-500">
                      Lớp
                    </p>

                    <p className="font-medium">
                      {assignment.class.name}
                    </p>
                  </div>

                  {/* Teacher */}
                  <div>
                    <p className="text-sm text-gray-500">
                      Giáo viên
                    </p>

                    <p className="font-medium">
                      {assignment.teacher.name}
                    </p>
                  </div>

                  {/* Due */}
                  <div>
                    <p className="text-sm text-gray-500">
                      Hạn nộp
                    </p>

                    <p className="font-medium">
                      {formatDate(
                        assignment.dueAt
                      )}
                    </p>
                  </div>
                </div>

                {/* Button */}
                <div className="mt-5">
                  <Link
                    href={`/student/assignments/${assignment.id}`}
                    className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
                  >
                    Xem bài tập
                  </Link>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}