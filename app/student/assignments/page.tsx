"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, CheckCircle2, Clock3, RefreshCw, Search, AlertCircle } from "lucide-react";

type Skill = "LISTENING" | "SPEAKING" | "READING" | "WRITING";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Status = "UPCOMING" | "NOT_STARTED" | "SUBMITTED" | "EXPIRED";
type Submission = { id: string; score: number | null; submittedAt: string | null };
type ApiAssignment = {
  id: string;
  title?: string | null;
  description?: string | null;
  startAt: string;
  dueAt?: string | null;
  exercise: { id: string; title: string; description?: string | null; skill: Skill; difficulty: Difficulty };
  class: { id: string; name: string; code: string; grade: number };
  teacher: { id: string; name: string };
  submissions?: Submission[];
  submission?: Submission | null;
};
type Assignment = ApiAssignment & { status: Status; submission: Submission | null };

const skillConfig: Record<Skill, { label: string; icon: string; bg: string }> = {
  READING: { label: "Reading", icon: "📖", bg: "bg-blue-50" },
  LISTENING: { label: "Listening", icon: "🎧", bg: "bg-purple-50" },
  SPEAKING: { label: "Speaking", icon: "🎤", bg: "bg-emerald-50" },
  WRITING: { label: "Writing", icon: "✍️", bg: "bg-orange-50" },
};
const difficultyLabels: Record<Difficulty, string> = { EASY: "Dễ", MEDIUM: "Trung bình", HARD: "Khó" };
const statusLabels: Record<Status, string> = {
  UPCOMING: "Sắp bắt đầu", NOT_STARTED: "Chưa làm", SUBMITTED: "Đã nộp", EXPIRED: "Hết hạn",
};
const statusStyles: Record<Status, string> = {
  UPCOMING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  NOT_STARTED: "bg-amber-50 text-amber-700 border-amber-200",
  SUBMITTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EXPIRED: "bg-red-50 text-red-700 border-red-200",
};

function formatDate(value?: string | null) {
  if (!value) return "Không giới hạn";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Không xác định" : date.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function normalize(item: ApiAssignment, now: number): Assignment {
  const submission = item.submissions?.find((entry) => entry.submittedAt != null)
    ?? item.submissions?.[0] ?? item.submission ?? null;
  const start = new Date(item.startAt).getTime();
  const due = item.dueAt ? new Date(item.dueAt).getTime() : null;
  const status: Status = submission?.submittedAt ? "SUBMITTED"
    : Number.isFinite(start) && start > now ? "UPCOMING"
    : due !== null && Number.isFinite(due) && due < now ? "EXPIRED"
    : "NOT_STARTED";
  return { ...item, submission, status };
}
function getErrorMessage(value: unknown, fallback: string): string {
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
  }
  return fallback;
}

export default function StudentAssignmentsPage() {
  const [items, setItems] = useState<ApiAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");
  const [skillFilter, setSkillFilter] = useState<"ALL" | Skill>("ALL");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const loadAssignments = useCallback(async () => {
    try {
      const response = await fetch("/api/student/assignments", { cache: "no-store" });
      const text = await response.text();
      let data: unknown;
      try { data = text ? JSON.parse(text) : null; }
      catch { throw new Error("API trả về dữ liệu không phải JSON. Hãy kiểm tra đường dẫn API."); }
      if (!response.ok) throw new Error(getErrorMessage(data, `Không thể tải bài tập (${response.status})`));
      const list = Array.isArray(data) ? data
        : data && typeof data === "object" && "assignments" in data
          ? (data as { assignments: unknown }).assignments : null;
      if (!Array.isArray(list)) throw new Error("Dữ liệu danh sách bài tập không hợp lệ.");
      setItems(list as ApiAssignment[]);
      setNow(Date.now());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải bài tập.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadAssignments());
  }, [loadAssignments]);
  const refreshAssignments = useCallback(() => {
    setLoading(true);
    setError("");
    void loadAssignments();
  }, [loadAssignments]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const assignments = useMemo(() => items.map((item) => normalize(item, now)), [items, now]);
  const counts = useMemo(() => ({
    total: assignments.length,
    upcoming: assignments.filter((a) => a.status === "UPCOMING").length,
    pending: assignments.filter((a) => a.status === "NOT_STARTED").length,
    completed: assignments.filter((a) => a.status === "SUBMITTED").length,
    expired: assignments.filter((a) => a.status === "EXPIRED").length,
  }), [assignments]);
  const filtered = useMemo(() => assignments.filter((a) => {
    const q = search.trim().toLowerCase();
    return (statusFilter === "ALL" || a.status === statusFilter)
      && (skillFilter === "ALL" || a.exercise.skill === skillFilter)
      && (!q || [a.title ?? "", a.exercise.title, a.class.name, a.teacher.name]
        .some((part) => part.toLowerCase().includes(q)));
  }), [assignments, search, skillFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">Student Portal / Assignments</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-800">Bài tập được giao</h1>
            <p className="mt-1 text-sm text-slate-500">Theo dõi bài tập của các lớp bạn đã tham gia.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={refreshAssignments} disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Làm mới
            </button>
            <Link href="/student" className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Dashboard</Link>
          </div>
        </div>
      </header>
      <main className="space-y-6 p-6 lg:p-8">
        <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-7 text-white">
          <p className="text-sm text-blue-100">Học tập</p>
          <h2 className="mt-2 text-2xl font-bold">Bài tập của bạn</h2>
          <p className="mt-2 text-sm text-blue-100">Xem bài được giao, làm bài đúng thời hạn và xem lại kết quả đã nộp.</p>
        </section>
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: "Tất cả", value: counts.total, icon: BookOpen },
            { label: "Sắp bắt đầu", value: counts.upcoming, icon: CalendarDays },
            { label: "Chưa làm", value: counts.pending, icon: Clock3 },
            { label: "Đã nộp", value: counts.completed, icon: CheckCircle2 },
            { label: "Hết hạn", value: counts.expired, icon: AlertCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Icon size={20} className="text-blue-600" />
              <p className="mt-3 text-2xl font-bold text-slate-800">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm bài tập, lớp, giáo viên..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400" />
            </div>
            <select aria-label="Lọc trạng thái" value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | Status)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <select aria-label="Lọc kỹ năng" value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value as "ALL" | Skill)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
              <option value="ALL">Tất cả kỹ năng</option>
              {Object.entries(skillConfig).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </div>
        </section>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800">Danh sách bài tập</h2>
            <span className="text-sm text-slate-500">{filtered.length} / {assignments.length} bài</span>
          </div>
          {loading ? <p className="py-16 text-center text-sm text-slate-500">Đang tải danh sách bài tập...</p>
            : error ? <div className="py-10 text-center"><button type="button" onClick={refreshAssignments} className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white">Thử lại</button></div>
            : filtered.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">Không có bài tập phù hợp.</p>
            : <div className="space-y-4">{filtered.map((assignment) => {
              const skill = skillConfig[assignment.exercise.skill] ?? skillConfig.READING;
              const status = assignment.status;
              return (
                <article key={assignment.id} className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${skill.bg}`}>{skill.icon}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-800">{assignment.title || assignment.exercise.title}</h3>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>{statusLabels[status]}</span>
                        </div>
                        {(assignment.description || assignment.exercise.description) &&
                          <p className="mt-2 text-sm text-slate-500">{assignment.description || assignment.exercise.description}</p>}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          {[skill.label, difficultyLabels[assignment.exercise.difficulty], `Lớp ${assignment.class.name} (khối ${assignment.class.grade})`, `GV: ${assignment.teacher.name}`]
                            .map((label) => <span key={label} className="rounded-full bg-slate-100 px-3 py-1">{label}</span>)}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                          <span>Bắt đầu: {formatDate(assignment.startAt)}</span>
                          <span>Hạn nộp: {formatDate(assignment.dueAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 lg:pl-4">
                      {status === "SUBMITTED" && <div className="text-right">
                        <p className="text-xs text-slate-500">Điểm</p>
                        <p className="text-xl font-bold text-emerald-600">{assignment.submission?.score == null ? "Chưa chấm" : assignment.submission.score.toFixed(1)}</p>
                        <p className="text-xs text-slate-400">{formatDate(assignment.submission?.submittedAt)}</p>
                      </div>}
                      {status === "NOT_STARTED" && <Link href={`/student/assignments/${assignment.id}`}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Làm bài</Link>}
                      {status === "SUBMITTED" && <Link href={`/student/assignments/${assignment.id}?review=true`}
                        className="rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Xem bài đã làm</Link>}
                      {status === "UPCOMING" && <span className="rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700">Chưa đến giờ mở bài</span>}
                      {status === "EXPIRED" && <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500">Đã hết hạn</span>}
                    </div>
                  </div>
                </article>
              );
            })}</div>}
        </section>
      </main>
    </div>
  );
}
