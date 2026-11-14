
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Filter,
  GraduationCap,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

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

const skillConfig: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  LISTENING: {
    label: "Listening",
    icon: "🎧",
    color: "bg-sky-50 text-sky-700 border-sky-100",
  },
  SPEAKING: {
    label: "Speaking",
    icon: "🎤",
    color: "bg-violet-50 text-violet-700 border-violet-100",
  },
  READING: {
    label: "Reading",
    icon: "📖",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  WRITING: {
    label: "Writing",
    icon: "✍️",
    color: "bg-orange-50 text-orange-700 border-orange-100",
  },
};

const difficultyLabels: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

function formatDate(value: string | null) {
  if (!value) return "Chưa nộp";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không xác định";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// API hiện được giả định trả điểm theo thang 100. Chỉ đổi cách hiển thị, không sửa DB.
function toScore10(score: number): number {
  return score;
}

function getScoreStyle(score: number | null) {
  if (score === null) {
    return {
      text: "Chưa chấm",
      color: "bg-slate-100 text-slate-600",
      bar: "bg-slate-300",
    };
  }

  if (score >= 8) {
    return {
      text: "Xuất sắc",
      color: "bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
    };
  }

  if (score >= 6.5) {
    return {
      text: "Tốt",
      color: "bg-blue-50 text-blue-700",
      bar: "bg-blue-500",
    };
  }

  if (score >= 5) {
    return {
      text: "Đạt",
      color: "bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
    };
  }

  return {
    text: "Cần cố gắng",
    color: "bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
  };
}

export default function StudentHistoryPage() {
  const [history, setHistory] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/student/history", {
        cache: "no-store",
      });

      const text = await response.text();
      let data: unknown = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          `API trả về dữ liệu không hợp lệ (HTTP ${response.status})`
        );
      }

      if (!response.ok) {
        const apiError =
          data && typeof data === "object"
            ? (data as { error?: string; message?: string })
            : null;

        throw new Error(
          apiError?.error ||
            apiError?.message ||
            "Không thể tải lịch sử làm bài"
        );
      }

      const result = Array.isArray(data)
        ? data
        : data &&
            typeof data === "object" &&
            "history" in data &&
            Array.isArray(data.history)
          ? data.history
          : null;

      if (!result) {
        throw new Error("Dữ liệu lịch sử không đúng định dạng");
      }

      setHistory(result as Submission[]);
      setError("");
    } catch (err) {
      console.error("LOAD STUDENT HISTORY ERROR:", err);
      setError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi"
      );
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadHistory());
  }, [loadHistory]);

  const refreshHistory = useCallback(() => {
    setLoading(true);
    setError("");
    void loadHistory();
  }, [loadHistory]);

  const stats = useMemo(() => {
    const completed = history.filter(
      (item) => item.submittedAt !== null
    );

    const scored = completed.filter(
      (item) => item.score !== null
    );

    const average =
      scored.length > 0
        ? scored.reduce((sum, item) => sum + Number(item.score), 0) /
          scored.length
        : null;

    const best =
      scored.length > 0
        ? Math.max(...scored.map((item) => Number(item.score)))
        : null;

    return {
      total: completed.length,
      average,
      best,
      scoredCount: scored.length,
    };
  }, [history]);

  const filteredHistory = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = history.filter((item) => {
      const matchesSearch =
        item.exercise.title.toLowerCase().includes(keyword) ||
        item.class.name.toLowerCase().includes(keyword) ||
        item.class.code.toLowerCase().includes(keyword);

      const matchesSkill =
        skillFilter === "ALL" ||
        item.exercise.skill === skillFilter;

      return matchesSearch && matchesSkill;
    });

    return result.sort((a, b) => {
      if (sortBy === "SCORE_HIGH") {
        return (b.score ?? -1) - (a.score ?? -1);
      }

      if (sortBy === "SCORE_LOW") {
        return (a.score ?? 101) - (b.score ?? 101);
      }

      const dateA = new Date(
        a.submittedAt ?? a.createdAt
      ).getTime();

      const dateB = new Date(
        b.submittedAt ?? b.createdAt
      ).getTime();

      return sortBy === "OLDEST"
        ? dateA - dateB
        : dateB - dateA;
    });
  }, [history, search, skillFilter, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 md:px-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Link href="/student" className="hover:text-blue-600">
                Student Portal
              </Link>
              <ChevronRight size={14} />
              <span className="font-medium text-slate-600">
                Lịch sử học tập
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Lịch sử làm bài
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Theo dõi kết quả và xem lại các bài tập đã hoàn thành.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshHistory}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Làm mới
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-7 text-white shadow-lg shadow-blue-100 md:p-9">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />
          <div className="absolute right-20 top-24 h-32 w-32 rounded-full bg-white/10" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                <Sparkles size={14} />
                Learning Journey
              </div>

              <h2 className="text-2xl font-bold md:text-3xl">
                Hành trình học tập của bạn
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-7 text-blue-100">
                Mỗi bài tập hoàn thành là một bước tiến mới.
                Cùng nhìn lại kết quả và tiếp tục cải thiện
                bốn kỹ năng tiếng Anh nhé!
              </p>

              <Link
                href="/student/assignments"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                Tiếp tục làm bài
                <ArrowRight size={17} />
              </Link>
            </div>

            <div className="hidden h-28 w-28 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-6xl backdrop-blur-sm md:flex">
              🎓
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Bài đã hoàn thành"
            value={stats.total.toString()}
            icon={<CheckCircle2 size={23} />}
            color="blue"
            subtitle="Bài tập đã nộp"
          />

          <StatCard
            title="Điểm trung bình"
            value={
              stats.average !== null
                ? toScore10(stats.average).toFixed(1)
                : "—"
            }
            icon={<Target size={23} />}
            color="violet"
            subtitle="Thang điểm 10"
          />

          <StatCard
            title="Điểm cao nhất"
            value={
              stats.best !== null
                ? toScore10(stats.best).toFixed(1)
                : "—"
            }
            icon={<TrendingUp size={23} />}
            color="emerald"
            subtitle="Kết quả tốt nhất"
          />

          <StatCard
            title="Bài đã chấm điểm"
            value={stats.scoredCount.toString()}
            icon={<ClipboardList size={23} />}
            color="orange"
            subtitle="Có kết quả đánh giá"
          />
        </section>

        {/* Search and filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Filter size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">
              Tìm kiếm và bộ lọc
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="relative lg:col-span-6">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên bài tập, lớp học, mã lớp..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            <select
              value={skillFilter}
              onChange={(event) => setSkillFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 lg:col-span-3"
            >
              <option value="ALL">Tất cả kỹ năng</option>
              <option value="LISTENING">🎧 Listening</option>
              <option value="SPEAKING">🎤 Speaking</option>
              <option value="READING">📖 Reading</option>
              <option value="WRITING">✍️ Writing</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 lg:col-span-3"
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="OLDEST">Cũ nhất</option>
              <option value="SCORE_HIGH">Điểm cao nhất</option>
              <option value="SCORE_LOW">Điểm thấp nhất</option>
            </select>
          </div>
        </section>

        {/* History */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <BookOpen size={20} className="text-blue-600" />
                Danh sách bài đã làm
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {filteredHistory.length} kết quả
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              Tổng: {history.length} bản ghi
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw
                size={32}
                className="animate-spin text-blue-600"
              />
              <p className="mt-4 text-sm text-slate-500">
                Đang tải lịch sử làm bài...
              </p>
            </div>
          ) : error ? (
            <div className="p-8">
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <AlertCircle
                  size={32}
                  className="mx-auto text-red-500"
                />
                <p className="mt-3 font-semibold text-red-700">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={refreshHistory}
                  className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-4xl">
                📭
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-800">
                {history.length === 0
                  ? "Chưa có lịch sử làm bài"
                  : "Không tìm thấy kết quả phù hợp"}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {history.length === 0
                  ? "Bạn chưa hoàn thành bài tập nào. Hãy bắt đầu với bài tập đầu tiên!"
                  : "Hãy thử thay đổi từ khóa hoặc bộ lọc kỹ năng."}
              </p>

              {history.length === 0 && (
                <Link
                  href="/student/assignments"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Khám phá bài tập
                  <ArrowRight size={17} />
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredHistory.map((item) => {
                const skill =
                  skillConfig[item.exercise.skill] ?? {
                    label: item.exercise.skill,
                    icon: "📚",
                    color: "bg-slate-50 text-slate-700 border-slate-100",
                  };

                const scoreInfo = getScoreStyle(item.score);

                return (
                  <article
                    key={item.id}
                    className="group p-5 transition hover:bg-slate-50/80 md:p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl ${skill.color}`}
                        >
                          {skill.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900 md:text-lg">
                              {item.exercise.title}
                            </h4>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scoreInfo.color}`}
                            >
                              {scoreInfo.text}
                            </span>
                          </div>

                          {item.exercise.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                              {item.exercise.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <GraduationCap size={14} />
                              {item.class.name} ({item.class.code})
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <BookOpen size={14} />
                              {skill.label}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <FileText size={14} />
                              {difficultyLabels[
                                item.exercise.difficulty
                              ] ?? item.exercise.difficulty}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays size={14} />
                              {formatDate(item.submittedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                        <div className="min-w-28">
                          <p className="text-xs font-medium text-slate-400">
                            Điểm số
                          </p>

                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold text-slate-900">
                              {item.score !== null
                                ? toScore10(Number(item.score)).toFixed(1)
                                : "—"}
                            </span>

                            {item.score !== null && (
                              <span className="text-sm text-slate-400">
                                /10
                              </span>
                            )}
                          </div>

                          <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${scoreInfo.bar}`}
                              style={{
  width: `${
    item.score !== null
      ? Math.min(100, Math.max(0, item.score * 10))
      : 0
  }%`,
}}
                            />
                          </div>
                        </div>

                        <Link
                          href={`/student/assignments/${item.assignmentId}?review=true`}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                        >
                          Xem chi tiết
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="flex items-center justify-center gap-2 pb-4 text-xs text-slate-400">
          <Clock3 size={14} />
          Kết quả được cập nhật từ hệ thống bài tập của bạn
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: "blue" | "violet" | "emerald" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colors[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
