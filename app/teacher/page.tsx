
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Skill = "READING" | "LISTENING" | "SPEAKING" | "WRITING";

type Statistics = {
  totalClasses: number;
  totalStudents: number;
  totalExercises: number;
  totalAssignments: number;
  totalSubmissions: number;
  awaitingGrading: number;
  gradedSubmissions: number;
  averageScore: number | null;
};

type TeacherClass = {
  id: string;
  name: string;
  code: string;
  grade: number;
  studentCount: number;
  assignmentCount: number;
};

type RecentAssignment = {
  id: string;
  title: string;
  skill: Skill;
  className: string;
  classId: string;
  createdAt: string;
  dueAt: string | null;
  submittedCount: number;
  awaitingGradingCount: number;
};

type DashboardData = {
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  statistics: Statistics;
  skillProgress: Record<Skill, number | null>;
  recentClasses: TeacherClass[];
  recentAssignments: RecentAssignment[];
  scoreScale: number;
};

const skillConfig: Record<
  Skill,
  { name: string; icon: string; color: string }
> = {
  READING: {
    name: "Reading",
    icon: "📖",
    color: "bg-blue-600",
  },
  LISTENING: {
    name: "Listening",
    icon: "🎧",
    color: "bg-purple-600",
  },
  SPEAKING: {
    name: "Speaking",
    icon: "🎤",
    color: "bg-green-600",
  },
  WRITING: {
    name: "Writing",
    icon: "✍️",
    color: "bg-orange-500",
  },
};

function formatDate(date: string | null) {
  if (!date) return "Không có hạn";

  return new Date(date).toLocaleDateString("vi-VN");
}

function formatScore(score: number | null) {
  return score === null ? "Chưa có điểm" : `${score.toFixed(2)}/10`;
}

export default function TeacherDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/teacher/dashboard", {
        cache: "no-store",
      });

      const text = await response.text();

      let data: unknown = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("API không trả về dữ liệu JSON hợp lệ");
        }
      }

      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : "Không thể tải dữ liệu Dashboard";

        throw new Error(message);
      }

      if (!data || typeof data !== "object") {
        throw new Error("Dữ liệu Dashboard không hợp lệ");
      }

      setDashboard(data as DashboardData);
    } catch (err) {
      console.error("Teacher Dashboard Error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi tải dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadDashboard());
  }, [loadDashboard]);

  const stats = dashboard?.statistics;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 lg:px-8">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Teacher Portal
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-800">
              Tổng quan giảng dạy
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Đang tải..." : "Làm mới"}
            </button>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {dashboard?.teacher.name || "Giáo viên"}
              </p>
              <p className="text-xs text-slate-500">
                {dashboard?.teacher.email || "Teacher"}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
              {dashboard?.teacher.name?.charAt(0).toUpperCase() ||
                "T"}
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-8 p-6 lg:p-8">
        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-3 text-sm font-semibold text-red-700 underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* WELCOME */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-7 text-white shadow-sm">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-blue-100">
                Chào mừng quay trở lại 👋
              </p>

              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                {dashboard?.teacher.name
                  ? `Xin chào, ${dashboard.teacher.name}!`
                  : "Teacher Dashboard"}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                Quản lý lớp học, theo dõi kết quả học tập và hỗ trợ
                học sinh phát triển cả 4 kỹ năng tiếng Anh.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/teacher/classes/create"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                >
                  + Tạo lớp học
                </Link>

                <Link
                  href="/teacher/exercises/create"
                  className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"
                >
                  + Tạo bài tập
                </Link>
              </div>
            </div>

            <div className="hidden text-7xl md:block">👨‍🏫</div>
          </div>
        </section>

        {/* STATISTICS */}
        <section>
          <SectionHeading
            title="Thống kê tổng quan"
            description="Dữ liệu giảng dạy được cập nhật từ hệ thống"
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Lớp học"
              value={stats?.totalClasses ?? 0}
              icon="🏫"
              description="Lớp đang quản lý"
              href="/teacher/classes"
            />

            <StatCard
              title="Học sinh"
              value={stats?.totalStudents ?? 0}
              icon="👨‍🎓"
              description="Học sinh trong các lớp"
              href="/teacher/students"
            />

            <StatCard
              title="Bài tập đã tạo"
              value={stats?.totalExercises ?? 0}
              icon="📚"
              description="Ngân hàng bài tập"
              href="/teacher/exercises"
            />

            <StatCard
              title="Bài đã giao"
              value={stats?.totalAssignments ?? 0}
              icon="📝"
              description="Bài tập giao cho lớp"
              href="/teacher/assignments"
            />

            <StatCard
              title="Bài đã nộp"
              value={stats?.totalSubmissions ?? 0}
              icon="📥"
              description="Lượt nộp của học sinh"
            />

            <StatCard
              title="Chờ chấm"
              value={stats?.awaitingGrading ?? 0}
              icon="⏳"
              description="Bài nộp chưa có điểm"
            />

            <StatCard
              title="Đã chấm"
              value={stats?.gradedSubmissions ?? 0}
              icon="✅"
              description="Bài nộp đã có điểm"
            />

            <StatCard
              title="Điểm trung bình"
              value={formatScore(stats?.averageScore ?? null)}
              icon="⭐"
              description="Thang điểm 10"
            />
          </div>
        </section>

        {/* SKILLS AND QUICK ACTIONS */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <SectionHeading
              title="Kết quả 4 kỹ năng"
              description="Điểm trung bình từ các bài đã được chấm"
            />

            <div className="mt-6 space-y-5">
              {(
                [
                  "READING",
                  "LISTENING",
                  "SPEAKING",
                  "WRITING",
                ] as Skill[]
              ).map((skill) => (
                <SkillProgress
                  key={skill}
                  skill={skill}
                  score={dashboard?.skillProgress?.[skill] ?? null}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeading
              title="Truy cập nhanh"
              description="Các chức năng dành cho giáo viên"
            />

            <div className="mt-6 space-y-3">
              <QuickAction
                href="/teacher/classes"
                icon="🏫"
                title="Quản lý lớp học"
                description="Xem lớp và học sinh"
              />

              <QuickAction
                href="/teacher/exercises"
                icon="📚"
                title="Ngân hàng bài tập"
                description="Tạo và chỉnh sửa bài tập"
              />

              <QuickAction
                href="/teacher/assignments"
                icon="📋"
                title="Quản lý giao bài"
                description="Theo dõi bài tập đã giao"
              />

              <QuickAction
                href="/teacher/ai-generator"
                icon="🤖"
                title="AI Generator"
                description="Tạo bài tập bằng AI"
              />
            </div>
          </section>
        </div>

        {/* CLASSES */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading
              title="Lớp học của tôi"
              description="Danh sách lớp đang quản lý"
            />

            <Link
              href="/teacher/classes"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Xem tất cả →
            </Link>
          </div>

          {loading && !dashboard ? (
            <LoadingState />
          ) : dashboard?.recentClasses.length ? (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.recentClasses.map((classItem) => (
                <Link
                  key={classItem.id}
                  href={`/teacher/classes/${classItem.id}`}
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                      🏫
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Khối {classItem.grade}
                    </span>
                  </div>

                  <h3 className="mt-4 font-bold text-slate-800">
                    {classItem.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Mã lớp: {classItem.code}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <span className="text-slate-600">
                      👨‍🎓 {classItem.studentCount} học sinh
                    </span>

                    <span className="text-slate-600">
                      📝 {classItem.assignmentCount} bài
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="Bạn chưa tạo lớp học nào." />
          )}
        </section>

        {/* RECENT ASSIGNMENTS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading
              title="Bài tập đã giao gần đây"
              description="Theo dõi tình trạng nộp bài và chấm điểm"
            />

            <Link
              href="/teacher/assignments"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Xem tất cả →
            </Link>
          </div>

          {loading && !dashboard ? (
            <LoadingState />
          ) : dashboard?.recentAssignments.length ? (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-4 py-3 font-semibold">
                      Bài tập
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Lớp
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Kỹ năng
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Đã nộp
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Chờ chấm
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Hạn nộp
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard.recentAssignments.map((assignment) => (
                    <tr
                      key={assignment.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {assignment.title}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {assignment.className}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          {skillConfig[assignment.skill].icon}{" "}
                          {skillConfig[assignment.skill].name}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {assignment.submittedCount}
                      </td>

                      <td className="px-4 py-4">
                        {assignment.awaitingGradingCount > 0 ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            {assignment.awaitingGradingCount} bài
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(assignment.dueAt)}
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/teacher/assignments/${assignment.id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          Xem chi tiết →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="Chưa có bài tập nào được giao." />
          )}
        </section>
      </main>
    </div>
  );
}

// ==========================================
// COMPONENTS
// ==========================================

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
  href,
}: {
  title: string;
  value: string | number;
  icon: string;
  description: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-800">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function SkillProgress({
  skill,
  score,
}: {
  skill: Skill;
  score: number | null;
}) {
  const config = skillConfig[skill];

  const safeScore =
    score === null
      ? null
      : Math.max(0, Math.min(10, score));

  const percentage =
    safeScore === null ? 0 : safeScore * 10;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{config.icon}</span>
          <span className="font-semibold text-slate-700">
            {config.name}
          </span>
        </div>

        <span className="text-sm font-bold text-slate-700">
          {safeScore === null
            ? "Chưa có điểm"
            : `${safeScore.toFixed(2)}/10`}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${config.color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-slate-800">
          {title}
        </p>

        <p className="text-xs text-slate-500">
          {description}
        </p>
      </div>

      <span className="ml-auto text-slate-400">→</span>
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="py-12 text-center text-sm text-slate-500">
      Đang tải dữ liệu...
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-xl bg-slate-50 py-12 text-center">
      <div className="text-4xl">📭</div>
      <p className="mt-3 text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}
