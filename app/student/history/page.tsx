"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Exercise = {
  id: string;
  title: string;
  description: string | null;
  skill: string;
  difficulty: string;
};

type ClassInfo = {
  id: string;
  name: string;
  code: string;
  grade: number;
};

type Submission = {
  id: string;
  assignmentId: string;
  exercise: Exercise;
  class: ClassInfo;
  score: number | null;
  submittedAt: string | null;
  createdAt: string;
};

const skillLabels: Record<string, string> = {
  LISTENING: "Nghe",
  SPEAKING: "Nói",
  READING: "Đọc",
  WRITING: "Viết",
};

const difficultyLabels: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

export default function StudentHistoryPage() {
  const [history, setHistory] = useState<
    Submission[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/student/history"
        );

        const text = await response.text();

        console.log(
          "STUDENT HISTORY STATUS:",
          response.status
        );

        console.log(
          "STUDENT HISTORY RESPONSE:",
          text
        );

        let data: any = [];

        try {
          data = text
            ? JSON.parse(text)
            : [];
        } catch {
          throw new Error(
            `API trả về dữ liệu không hợp lệ. HTTP ${response.status}`
          );
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Không thể lấy lịch sử làm bài"
          );
        }

        const historyData =
          Array.isArray(data)
            ? data
            : data.history ?? [];

        setHistory(historyData);
      } catch (error) {
        console.error(
          "LOAD HISTORY ERROR:",
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

    loadHistory();
  }, []);

  // =========================
  // Loading
  // =========================
  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">
          Đang tải lịch sử làm bài...
        </p>
      </div>
    );
  }

  // =========================
  // Error
  // =========================
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-700">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Lịch sử làm bài
        </h1>

        <p className="mt-1 text-gray-600">
          Xem lại các bài tập bạn đã hoàn thành.
        </p>
      </div>

      {/* Empty */}
      {history.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Chưa có lịch sử làm bài
          </h2>

          <p className="mt-2 text-gray-500">
            Bạn chưa hoàn thành bài tập nào.
          </p>

          <Link
            href="/student/assignments"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
          >
            Xem bài tập
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Bài tập
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Lớp
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Kỹ năng
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Độ khó
                  </th>

                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    Điểm
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Ngày nộp
                  </th>

                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    Chi tiết
                  </th>
                </tr>
              </thead>

              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    {/* Exercise */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.exercise.title}
                        </p>

                        {item.exercise
                          .description && (
                          <p className="mt-1 max-w-xs truncate text-sm text-gray-500">
                            {
                              item.exercise
                                .description
                            }
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Class */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-800">
                          {item.class.name}
                        </p>

                        <p className="text-sm text-gray-500">
                          {item.class.code}
                        </p>
                      </div>
                    </td>

                    {/* Skill */}
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                        {skillLabels[
                          item.exercise.skill
                        ] ||
                          item.exercise.skill}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td className="px-4 py-4">
                      {difficultyLabels[
                        item.exercise
                          .difficulty
                      ] ||
                        item.exercise
                          .difficulty}
                    </td>

                    {/* Score */}
                    <td className="px-4 py-4 text-center">
                      <span className="font-bold">
                        {item.score !== null
                          ? `${item.score}/100`
                          : "—"}
                      </span>
                    </td>

                    {/* Submitted date */}
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {item.submittedAt
                        ? new Date(
                            item.submittedAt
                          ).toLocaleString(
                            "vi-VN"
                          )
                        : "Chưa nộp"}
                    </td>

                    {/* Detail */}
                    <td className="px-4 py-4 text-center">
                      <Link
                        href={`/student/assignments/${item.assignmentId}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        Xem bài
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}