"use client";

import { useEffect, useState } from "react";

type ProgressData = {
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  averageScore: number;
  skills: {
    LISTENING: number;
    SPEAKING: number;
    READING: number;
    WRITING: number;
  };
};

const skillLabels: Record<string, string> = {
  LISTENING: "Listening",
  SPEAKING: "Speaking",
  READING: "Reading",
  WRITING: "Writing",
};

export default function StudentProgressPage() {
  const [progress, setProgress] =
    useState<ProgressData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProgress = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/student/progress"
        );

        const text = await response.text();

        console.log(
          "Progress status:",
          response.status
        );

        console.log(
          "Progress response:",
          text
        );

        if (!response.ok) {
          throw new Error(
            text || "Không thể lấy tiến độ"
          );
        }

        const data = text
          ? JSON.parse(text)
          : null;

        setProgress(data);
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

    loadProgress();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        Đang tải tiến độ học tập...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="p-6">
        Không có dữ liệu tiến độ.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Tiến độ học tập
        </h1>

        <p className="mt-1 text-gray-500">
          Theo dõi kết quả học tập của bạn
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Tổng số bài
          </p>

          <p className="mt-2 text-3xl font-bold">
            {progress.totalAssignments}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Đã hoàn thành
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {progress.completedAssignments}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Điểm trung bình
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-600">
            {progress.averageScore}
          </p>
        </div>
      </div>

      {/* Pending */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              Bài tập chưa hoàn thành
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Số bài bạn chưa nộp
            </p>
          </div>

          <span className="text-2xl font-bold text-orange-500">
            {progress.pendingAssignments}
          </span>
        </div>
      </div>

      {/* Skills */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Tiến độ theo 4 kỹ năng
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Điểm trung bình của các bài đã nộp
        </p>

        <div className="mt-6 space-y-5">
          {Object.entries(progress.skills).map(
            ([skill, score]) => {
              const percentage = Math.min(
                score * 10,
                100
              );

              return (
                <div key={skill}>
                  <div className="mb-2 flex justify-between">
                    <span className="font-medium">
                      {skillLabels[skill]}
                    </span>

                    <span className="font-semibold">
                      {score}/10
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}