"use client";

import { useEffect, useState } from "react";

type SkillStat = {
  exerciseCount: number;
  assignmentCount: number;
  submissionCount: number;
  averageScore: number;
};

type StatisticsData = {
  overview: {
    totalClasses: number;
    totalStudents: number;
    totalExercises: number;
    totalAssignments: number;
    totalSubmissions: number;
    submittedCount: number;
    averageScore: number;
  };

  skillStats: {
    LISTENING: SkillStat;
    SPEAKING: SkillStat;
    READING: SkillStat;
    WRITING: SkillStat;
  };
};

export default function TeacherStatisticsPage() {
  const [data, setData] =
    useState<StatisticsData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/teacher/statistics"
        );

        const text =
          await response.text();

        console.log(
          "STATISTICS STATUS:",
          response.status
        );

        console.log(
          "STATISTICS RESPONSE:",
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
          "STATISTICS ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Không thể tải thống kê"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p>Đang tải thống kê...</p>
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

  if (!data) {
    return (
      <div className="p-6">
        Không có dữ liệu.
      </div>
    );
  }

  const { overview, skillStats } =
    data;

  const skills = [
    {
      key: "LISTENING",
      label: "Listening",
      data: skillStats.LISTENING,
    },

    {
      key: "SPEAKING",
      label: "Speaking",
      data: skillStats.SPEAKING,
    },

    {
      key: "READING",
      label: "Reading",
      data: skillStats.READING,
    },

    {
      key: "WRITING",
      label: "Writing",
      data: skillStats.WRITING,
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-bold">
          Thống kê học tập
        </h1>

        <p className="mt-1 text-gray-600">
          Tổng quan hoạt động học tập của
          các lớp bạn phụ trách.
        </p>
      </div>

      {/* Overview */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Classes */}

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Tổng số lớp
          </p>

          <p className="mt-2 text-3xl font-bold">
            {overview.totalClasses}
          </p>
        </div>

        {/* Students */}

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Tổng học sinh
          </p>

          <p className="mt-2 text-3xl font-bold">
            {overview.totalStudents}
          </p>
        </div>

        {/* Exercises */}

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Tổng bài tập
          </p>

          <p className="mt-2 text-3xl font-bold">
            {overview.totalExercises}
          </p>
        </div>

        {/* Assignments */}

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Tổng Assignment
          </p>

          <p className="mt-2 text-3xl font-bold">
            {overview.totalAssignments}
          </p>
        </div>
      </div>

      {/* Submission statistics */}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Tổng lượt nộp
          </p>

          <p className="mt-2 text-3xl font-bold">
            {overview.totalSubmissions}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Đã hoàn thành:{" "}
            {overview.submittedCount}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Điểm trung bình
          </p>

          <p className="mt-2 text-3xl font-bold">
            {overview.averageScore}
          </p>
        </div>
      </div>

      {/* Skill statistics */}

      <div>
        <h2 className="mb-4 text-xl font-bold">
          Thống kê theo kỹ năng
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          {skills.map((skill) => (
            <div
              key={skill.key}
              className="rounded-xl border bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {skill.label}
                </h3>

                <span className="text-xl font-bold">
                  {skill.data.averageScore}
                </span>
              </div>

              {/* Progress */}

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${Math.min(
                      skill.data.averageScore *
                        10,
                      100
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">
                    Bài tập
                  </p>

                  <p className="font-semibold">
                    {skill.data.exerciseCount}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">
                    Assignment
                  </p>

                  <p className="font-semibold">
                    {skill.data.assignmentCount}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">
                    Lượt nộp
                  </p>

                  <p className="font-semibold">
                    {skill.data.submissionCount}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}