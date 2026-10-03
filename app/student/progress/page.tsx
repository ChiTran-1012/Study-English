"use client";

import { useEffect, useState } from "react";

type ProgressData = {
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  averageScore: number;
  skillProgress: {
    LISTENING: number;
    SPEAKING: number;
    READING: number;
    WRITING: number;
  };
};

const skillLabels: Record<
  string,
  string
> = {
  LISTENING: "Listening",
  SPEAKING: "Speaking",
  READING: "Reading",
  WRITING: "Writing",
};

export default function StudentProgressPage() {
  const [progress, setProgress] =
    useState<ProgressData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadProgress() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/student/progress"
        );

        const text =
          await response.text();

        console.log(
          "PROGRESS STATUS:",
          response.status
        );

        console.log(
          "PROGRESS RESPONSE:",
          text
        );

        let data: any = {};

        try {
          data = text
            ? JSON.parse(text)
            : {};
        } catch {
          throw new Error(
            `API trả về dữ liệu không hợp lệ. HTTP ${response.status}`
          );
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Không thể tải tiến độ"
          );
        }

        setProgress(data);
      } catch (error) {
        console.error(
          "LOAD PROGRESS ERROR:",
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

    loadProgress();
  }, []);

  // =========================
  // Loading
  // =========================
  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">
          Đang tải tiến độ học tập...
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

  if (!progress) {
    return null;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Tiến độ học tập
        </h1>

        <p className="mt-1 text-gray-600">
          Theo dõi kết quả học tập của bạn.
        </p>
      </div>

      {/* =========================
          Summary
      ========================= */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Tổng số bài
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {progress.totalAssignments}
          </p>
        </div>

        {/* Completed */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Đã hoàn thành
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {
              progress.completedAssignments
            }
          </p>
        </div>

        {/* Pending */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Chưa hoàn thành
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-500">
            {
              progress.pendingAssignments
            }
          </p>
        </div>

        {/* Average */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Điểm trung bình
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-600">
            {progress.averageScore}
          </p>
        </div>
      </div>

      {/* =========================
          Skills
      ========================= */}
      <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          Tiến độ theo 4 kỹ năng
        </h2>

        <div className="mt-6 space-y-6">
          {Object.entries(
            progress.skillProgress
          ).map(
            ([skill, score]) => (
              <div key={skill}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-gray-700">
                    {skillLabels[skill] ||
                      skill}
                  </span>

                  <span className="font-semibold text-gray-900">
                    {score}/100
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(
                          score,
                          0
                        ),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}