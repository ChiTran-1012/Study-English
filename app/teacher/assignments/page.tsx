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
    skill: string;
    difficulty: string;
  };

  class: {
    id: string;
    name: string;
    code: string;
    grade: number;
  };
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAssignments() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/assignments");

      const text = await response.text();

      console.log("GET /api/assignments:", response.status);
      console.log("Response:", text);

      if (!response.ok) {
        throw new Error(
          text || "Không thể tải danh sách bài được giao"
        );
      }

      const data = text ? JSON.parse(text) : [];

      setAssignments(data);
    } catch (error) {
      console.error("LOAD ASSIGNMENTS ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra"
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteAssignment(id: string) {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa bài giao này không?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/assignments/${id}`,
        {
          method: "DELETE",
        }
      );

      const text = await response.text();

      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể xóa bài giao"
        );
      }

      await loadAssignments();
    } catch (error) {
      console.error("DELETE ASSIGNMENT ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra"
      );
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  function formatDate(date: string | null) {
    if (!date) return "Không có";

    return new Date(date).toLocaleString("vi-VN");
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>Đang tải danh sách bài được giao...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Bài tập đã giao
          </h1>

          <p className="mt-1 text-gray-500">
            Quản lý các bài tập đã giao cho lớp học
          </p>
        </div>

        <Link
          href="/teacher/assignments/create"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + Giao bài tập
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Empty */}
      {!error && assignments.length === 0 && (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-500">
            Chưa có bài tập nào được giao.
          </p>

          <Link
            href="/teacher/assignments/create"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Giao bài tập đầu tiên
          </Link>
        </div>
      )}

      {/* Assignment list */}
      {assignments.length > 0 && (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {assignment.title ||
                      assignment.exercise.title}
                  </h2>

                  {assignment.description && (
                    <p className="mt-1 text-gray-500">
                      {assignment.description}
                    </p>
                  )}
                </div>

                <button
                  onClick={() =>
                    deleteAssignment(assignment.id)
                  }
                  className="rounded-lg border border-red-300 px-3 py-2 text-red-600 hover:bg-red-50"
                >
                  Xóa
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">
                    Bài tập
                  </p>

                  <p className="font-medium">
                    {assignment.exercise.title}
                  </p>

                  <p className="text-sm text-gray-500">
                    {assignment.exercise.skill} ·{" "}
                    {assignment.exercise.difficulty}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">
                    Lớp
                  </p>

                  <p className="font-medium">
                    {assignment.class.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {assignment.class.code} · Khối{" "}
                    {assignment.class.grade}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">
                    Bắt đầu
                  </p>

                  <p className="font-medium">
                    {formatDate(assignment.startAt)}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">
                    Hạn nộp
                  </p>

                  <p className="font-medium">
                    {formatDate(assignment.dueAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}