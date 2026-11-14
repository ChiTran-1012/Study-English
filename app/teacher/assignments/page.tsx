
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  ClipboardList,
  GraduationCap,
  Clock3,
  CalendarDays,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Filter,
  AlertCircle,
  Headphones,
  Mic,
  PenLine,
  BookText,
  Layers3,
  Pencil,
  X,
  Save,
} from "lucide-react";

type Assignment = {
  id: string;
  title: string | null;
  description: string | null;
  startAt: string;
  dueAt: string | null;
  _count?: { submissions: number };
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

const skillConfig: Record<
  string,
  {
    label: string;
    icon: typeof BookOpen;
    color: string;
    bg: string;
    border: string;
  }
> = {
  READING: {
    label: "Reading",
    icon: BookText,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  LISTENING: {
    label: "Listening",
    icon: Headphones,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-100",
  },
  SPEAKING: {
    label: "Speaking",
    icon: Mic,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  WRITING: {
    label: "Writing",
    icon: PenLine,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-100",
  },
};

const difficultyLabels: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

function formatDate(date: string | null) {
  if (!date) return "Không giới hạn";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Không xác định";

  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

type EditForm = {
  title: string;
  description: string;
  startAt: string;
  dueAt: string;
};

function getAssignmentStatus(assignment: Assignment) {
  const now = Date.now();
  const start = new Date(assignment.startAt).getTime();

  if (Number.isFinite(start) && start > now) {
    return {
      label: "Sắp bắt đầu",
      className: "bg-blue-50 text-blue-700 border-blue-100",
      status: "UPCOMING",
    };
  }

  if (
    assignment.dueAt &&
    new Date(assignment.dueAt).getTime() < now
  ) {
    return {
      label: "Đã hết hạn",
      className: "bg-red-50 text-red-700 border-red-100",
      status: "EXPIRED",
    };
  }

  return {
    label: "Đang diễn ra",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    status: "ACTIVE",
  };
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "", description: "", startAt: "", dueAt: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/assignments", {
        cache: "no-store",
      });

      const text = await response.text();

      let data: unknown = [];

      try {
        data = text ? JSON.parse(text) : [];
      } catch {
        throw new Error("API không trả về JSON hợp lệ");
      }

      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : "Không thể tải danh sách bài tập";

        throw new Error(message);
      }

      const items = Array.isArray(data)
        ? data
        : data &&
            typeof data === "object" &&
            "assignments" in data &&
            Array.isArray(data.assignments)
          ? data.assignments
          : null;

      if (!items) {
        throw new Error("Dữ liệu bài tập không hợp lệ");
      }

      setAssignments(items as Assignment[]);
    } catch (err) {
      console.error("LOAD ASSIGNMENTS ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra khi tải bài tập"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadAssignments());
  }, [loadAssignments]);

  async function openEdit(assignment: Assignment) {
    setEditError("");
    setEditLoading(true);
    setEditing(assignment);
    setEditForm({
      title: assignment.title ?? "",
      description: assignment.description ?? "",
      startAt: toLocalDateTime(assignment.startAt),
      dueAt: toLocalDateTime(assignment.dueAt),
    });
    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        cache: "no-store",
      });
      const text = await response.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch {
        throw new Error(`API chi tiết trả dữ liệu không hợp lệ (HTTP ${response.status}).`);
      }
      if (!response.ok) {
        const message = data && typeof data === "object" && "message" in data &&
          typeof data.message === "string" ? data.message : "Không thể tải bài giao";
        throw new Error(message);
      }
      const item = data as Assignment;
      if (!item?.id) throw new Error("Dữ liệu bài giao không hợp lệ");
      setEditing(item);
      setEditForm({
        title: item.title ?? "",
        description: item.description ?? "",
        startAt: toLocalDateTime(item.startAt),
        dueAt: toLocalDateTime(item.dueAt),
      });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Không thể tải bài giao");
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit() {
    if (!editing || editSaving || editLoading) return;
    setEditError("");
    if (!editForm.startAt) {
      setEditError("Vui lòng nhập ngày bắt đầu.");
      return;
    }
    const startAt = new Date(editForm.startAt);
    const dueAt = editForm.dueAt ? new Date(editForm.dueAt) : null;
    if (Number.isNaN(startAt.getTime()) ||
      (dueAt && Number.isNaN(dueAt.getTime()))) {
      setEditError("Ngày không hợp lệ.");
      return;
    }
    if (dueAt && dueAt <= startAt) {
      setEditError("Hạn nộp phải sau ngày bắt đầu.");
      return;
    }
    setEditSaving(true);
    try {
      const response = await fetch(`/api/assignments/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          startAt: startAt.toISOString(),
          dueAt: dueAt ? dueAt.toISOString() : null,
        }),
      });
      const text = await response.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch {
        throw new Error(`API cập nhật trả dữ liệu không hợp lệ (HTTP ${response.status}).`);
      }
      if (!response.ok) {
        const message = data && typeof data === "object" && "message" in data &&
          typeof data.message === "string" ? data.message : "Không thể cập nhật";
        throw new Error(message);
      }
      setEditing(null);
      await loadAssignments();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Không thể cập nhật bài giao");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteAssignment(id: string) {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa bài tập đã giao này?\n\n" +
        "Hệ thống sẽ từ chối xóa nếu đã có học sinh làm bài."
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const response = await fetch(`/api/assignments/${id}`, {
        method: "DELETE",
      });

      const text = await response.text();

      let data: { message?: string } = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || "Không thể xóa bài tập");
      }

      await loadAssignments();
    } catch (err) {
      console.error("DELETE ASSIGNMENT ERROR:", err);
      window.alert(
        err instanceof Error ? err.message : "Có lỗi xảy ra"
      );
    } finally {
      setDeletingId(null);
    }
  }

  const statistics = useMemo(() => {
    const uniqueClasses = new Set(
      assignments.map((item) => item.class.id)
    );

    const active = assignments.filter(
      (item) => getAssignmentStatus(item).status === "ACTIVE"
    ).length;

    const expired = assignments.filter(
      (item) => getAssignmentStatus(item).status === "EXPIRED"
    ).length;

    return {
      total: assignments.length,
      classes: uniqueClasses.size,
      active,
      expired,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return assignments
      .filter((item) => {
        const matchesSearch =
          !keyword ||
          (item.title || item.exercise.title)
            .toLowerCase()
            .includes(keyword) ||
          item.exercise.title.toLowerCase().includes(keyword) ||
          item.class.name.toLowerCase().includes(keyword) ||
          item.class.code.toLowerCase().includes(keyword);

        const matchesSkill =
          skillFilter === "ALL" ||
          item.exercise.skill === skillFilter;

        const matchesStatus =
          statusFilter === "ALL" ||
          getAssignmentStatus(item).status === statusFilter;

        return matchesSearch && matchesSkill && matchesStatus;
      })
      .sort(
        (a, b) =>
          new Date(b.startAt).getTime() -
          new Date(a.startAt).getTime()
      );
  }, [assignments, search, skillFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="mb-1 text-sm font-medium text-blue-600">
              Teacher Portal / Assignments
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Bài tập đã giao
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Quản lý bài tập, theo dõi thời hạn và xem kết quả học sinh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadAssignments()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Làm mới
            </button>

            <Link
              href="/teacher/assignments/create"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Giao bài tập
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-7 p-6 lg:p-8">
        {/* STATISTICS */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Tổng bài đã giao"
            value={statistics.total}
            icon={ClipboardList}
            color="blue"
          />

          <StatCard
            title="Số lớp nhận bài"
            value={statistics.classes}
            icon={GraduationCap}
            color="purple"
          />

          <StatCard
            title="Đang diễn ra"
            value={statistics.active}
            icon={Clock3}
            color="green"
          />

          <StatCard
            title="Đã hết hạn"
            value={statistics.expired}
            icon={CalendarDays}
            color="orange"
          />
        </section>

        {/* MAIN CONTENT */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Danh sách bài tập
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Hiển thị {filteredAssignments.length} /{" "}
                  {assignments.length} bài tập
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] flex-1">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm bài tập, lớp học..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="relative">
                  <Filter
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={skillFilter}
                    onChange={(e) => setSkillFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option value="ALL">Tất cả kỹ năng</option>
                    <option value="READING">Reading</option>
                    <option value="LISTENING">Listening</option>
                    <option value="SPEAKING">Speaking</option>
                    <option value="WRITING">Writing</option>
                  </select>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="UPCOMING">Sắp bắt đầu</option>
                  <option value="ACTIVE">Đang diễn ra</option>
                  <option value="EXPIRED">Đã hết hạn</option>
                </select>
              </div>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="m-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={20} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* LOADING */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <RefreshCw
                size={32}
                className="animate-spin text-blue-600"
              />
              <p className="mt-4 text-sm text-slate-500">
                Đang tải danh sách bài tập...
              </p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
                <BookOpen size={36} className="text-slate-400" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-800">
                {assignments.length === 0
                  ? "Chưa có bài tập nào"
                  : "Không tìm thấy bài tập"}
              </h3>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                {assignments.length === 0
                  ? "Hãy giao bài tập đầu tiên cho lớp học của bạn."
                  : "Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm."}
              </p>

              {assignments.length === 0 && (
                <Link
                  href="/teacher/assignments/create"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Giao bài tập đầu tiên
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 p-6 xl:grid-cols-2">
              {filteredAssignments.map((assignment) => {
                const skill =
                  skillConfig[assignment.exercise.skill] ||
                  skillConfig.READING;

                const SkillIcon = skill.icon;
                const status = getAssignmentStatus(assignment);

                return (
                  <article
                    key={assignment.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md"
                  >
                    {/* CARD HEADER */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${skill.bg} ${skill.border}`}
                        >
                          <SkillIcon
                            size={23}
                            className={skill.color}
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-base font-bold text-slate-800">
                            {assignment.title ||
                              assignment.exercise.title}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {assignment.exercise.title}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* DESCRIPTION */}
                    {assignment.description && (
                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                        {assignment.description}
                      </p>
                    )}

                    {/* TAGS */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${skill.bg} ${skill.color}`}
                      >
                        {skill.label}
                      </span>

                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                        {difficultyLabels[
                          assignment.exercise.difficulty
                        ] || assignment.exercise.difficulty}
                      </span>

                      <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                        Khối {assignment.class.grade}
                      </span>
                    </div>

                    {/* DETAILS */}
                    <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <GraduationCap
                          size={17}
                          className="mt-0.5 text-slate-400"
                        />
                        <div>
                          <p className="text-xs text-slate-400">
                            Lớp học
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {assignment.class.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {assignment.class.code}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <CalendarDays
                          size={17}
                          className="mt-0.5 text-slate-400"
                        />
                        <div>
                          <p className="text-xs text-slate-400">
                            Hạn nộp
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatDate(assignment.dueAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock3
                          size={17}
                          className="mt-0.5 text-slate-400"
                        />
                        <div>
                          <p className="text-xs text-slate-400">
                            Bắt đầu
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatDate(assignment.startAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Layers3
                          size={17}
                          className="mt-0.5 text-slate-400"
                        />
                        <div>
                          <p className="text-xs text-slate-400">
                            Kỹ năng
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {skill.label}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <Link
                        href={`/teacher/assignments/${assignment.id}/results`}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        <BarChart3 size={17} />
                        Xem kết quả
                        <ArrowRight size={16} />
                      </Link>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void openEdit(assignment)}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                        >
                          <Pencil size={16} /> Chỉnh sửa
                        </button>
                      <button
                        type="button"
                        onClick={() =>
                          void deleteAssignment(assignment.id)
                        }
                        disabled={deletingId === assignment.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                        {deletingId === assignment.id
                          ? "Đang xóa..."
                          : "Xóa bài"}
                      </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-assignment-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-assignment-title" className="text-xl font-bold text-slate-800">
                  Chỉnh sửa bài đã giao
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editing.exercise.title} · {editing.class.name}
                </p>
              </div>
              <button type="button" aria-label="Đóng" disabled={editSaving}
                onClick={() => setEditing(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X size={20} />
              </button>
            </div>

            {editLoading ? (
              <p className="py-10 text-center text-slate-500">Đang tải thông tin...</p>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={(event) => {
                event.preventDefault();
                void saveEdit();
              }}>
                {editError && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {editError}
                  </div>
                )}
                <div>
                  <label htmlFor="edit-title" className="mb-1 block text-sm font-medium text-slate-700">Tiêu đề</label>
                  <input id="edit-title" value={editForm.title} maxLength={200}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                    placeholder="Để trống để dùng tên bài tập gốc" />
                </div>
                <div>
                  <label htmlFor="edit-description" className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
                  <textarea id="edit-description" value={editForm.description} rows={3} maxLength={2000}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                    placeholder="Hướng dẫn dành cho học sinh" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-start" className="mb-1 block text-sm font-medium text-slate-700">Ngày bắt đầu</label>
                    <input id="edit-start" type="datetime-local" required value={editForm.startAt}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, startAt: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="edit-due" className="mb-1 block text-sm font-medium text-slate-700">Hạn nộp (tùy chọn)</label>
                    <input id="edit-due" type="datetime-local" value={editForm.dueAt}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, dueAt: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
                {typeof editing._count?.submissions === "number" && (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    Đã có {editing._count.submissions} bản ghi làm bài. Chỉnh sửa hạn nộp không xóa kết quả.
                  </p>
                )}
                <p className="text-xs text-slate-500">Để trống hạn nộp nếu không muốn giới hạn thời gian.</p>
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button type="button" disabled={editSaving} onClick={() => setEditing(null)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium disabled:opacity-50">
                    Hủy
                  </button>
                  <button type="submit" disabled={editSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {editSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {editSaving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            )}
            {editLoading && editError && <p className="mt-3 text-sm text-red-600">{editError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: typeof BookOpen;
  color: "blue" | "purple" | "green" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-800">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color]}`}
        >
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}
