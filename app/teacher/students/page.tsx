
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  School,
  Users,
  X,
} from "lucide-react";

type StudentClass = {
  id: string;
  name: string;
  code: string;
  grade: number;
};

type Student = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  classes: StudentClass[];
  submittedCount: number;
  gradedCount: number;
  awaitingGrading: number;
  averageScore: number | null;
};

type StudentsResponse = {
  statistics: {
    totalStudents: number;
    totalClasses: number;
    totalSubmissions: number;
  };
  classes: StudentClass[];
  students: Student[];
};

const PAGE_SIZE = 8;

function formatScore(score: number | null) {
  return score === null ? "Chưa có điểm" : `${score.toFixed(2)}/10`;
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "S";
}

export default function StudentsPage() {
  const [data, setData] = useState<StudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/teacher/students", {
        credentials: "same-origin",
        cache: "no-store",
      });

      const text = await response.text();

      let result: unknown;

      try {
        result = text ? JSON.parse(text) : null;
      } catch {
        throw new Error("API không trả về JSON hợp lệ");
      }

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Không thể tải danh sách học sinh";

        throw new Error(message);
      }

      if (
        !result ||
        typeof result !== "object" ||
        !("students" in result) ||
        !Array.isArray(result.students)
      ) {
        throw new Error("Dữ liệu học sinh không hợp lệ");
      }

      setData(result as StudentsResponse);
    } catch (err) {
      console.error("LOAD STUDENTS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadStudents());
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return (data?.students ?? []).filter((student) => {
      const matchesSearch =
        !keyword ||
        student.name.toLowerCase().includes(keyword) ||
        student.email.toLowerCase().includes(keyword) ||
        student.classes.some(
          (item) =>
            item.name.toLowerCase().includes(keyword) ||
            item.code.toLowerCase().includes(keyword)
        );

      const matchesClass =
        classFilter === "ALL" ||
        student.classes.some((item) => item.id === classFilter);

      return matchesSearch && matchesClass;
    });
  }, [data, search, classFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleStudents = filteredStudents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateClassFilter(value: string) {
    setClassFilter(value);
    setPage(1);
  }

  const stats = data?.statistics;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Teacher Portal / Students
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Quản lý học sinh
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Theo dõi học sinh, lớp học và kết quả học tập.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadStudents()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Làm mới
            </button>

            <Link
              href="/teacher/classes"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <School size={18} />
              Quản lý lớp
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-7 p-6 lg:p-8">
        {/* WELCOME */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-7 text-white shadow-sm">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />

          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm text-blue-100">
                Student Management
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Theo dõi hành trình học tập
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
                Quản lý học sinh trong các lớp, kiểm tra tiến độ
                làm bài và hỗ trợ cải thiện kết quả tiếng Anh.
              </p>
            </div>

            <GraduationCap
              size={70}
              className="hidden text-white/80 md:block"
            />
          </div>
        </section>

        {/* STATISTICS */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard
            title="Tổng học sinh"
            value={stats?.totalStudents ?? 0}
            icon={Users}
            color="blue"
          />

          <StatCard
            title="Lớp đang quản lý"
            value={stats?.totalClasses ?? 0}
            icon={School}
            color="purple"
          />

          <StatCard
            title="Lượt bài đã nộp"
            value={stats?.totalSubmissions ?? 0}
            icon={ClipboardCheck}
            color="green"
          />
        </section>

        {/* STUDENT LIST */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Danh sách học sinh
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredStudents.length} học sinh được tìm thấy
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[230px] flex-1">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      updateSearch(event.target.value)
                    }
                    placeholder="Tìm tên, email, lớp..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <select
                  value={classFilter}
                  onChange={(event) =>
                    updateClassFilter(event.target.value)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="ALL">Tất cả lớp học</option>

                  {(data?.classes ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>

                {(search || classFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setClassFilter("ALL");
                      setPage(1);
                    }}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-red-600"
                  >
                    <X size={16} />
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-slate-500">
              <Loader2
                size={24}
                className="animate-spin text-blue-600"
              />
              Đang tải danh sách học sinh...
            </div>
          ) : error ? null : filteredStudents.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
                <Users size={36} className="text-slate-400" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-800">
                Không tìm thấy học sinh
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Hãy kiểm tra bộ lọc hoặc thêm học sinh vào lớp.
              </p>

              <Link
                href="/teacher/classes"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Quản lý lớp học
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-4 font-semibold">
                        Học sinh
                      </th>
                      <th className="px-6 py-4 font-semibold">
                        Lớp học
                      </th>
                      <th className="px-6 py-4 font-semibold">
                        Đã nộp
                      </th>
                      <th className="px-6 py-4 font-semibold">
                        Chờ chấm
                      </th>
                      <th className="px-6 py-4 font-semibold">
                        Điểm TB
                      </th>
                      <th className="px-6 py-4 text-right font-semibold">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b border-slate-100 transition hover:bg-blue-50/30 last:border-0"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">
                              {getInitial(student.name)}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">
                                {student.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex max-w-[240px] flex-wrap gap-1.5">
                            {student.classes.map((item) => (
                              <span
                                key={item.id}
                                className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                                title={`${item.name} - ${item.code}`}
                              >
                                {item.name}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {student.submittedCount}
                        </td>

                        <td className="px-6 py-4">
                          {student.awaitingGrading > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              <Clock3 size={13} />
                              {student.awaitingGrading}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 size={14} />
                              0
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`font-bold ${
                              student.averageScore === null
                                ? "text-slate-400"
                                : "text-blue-700"
                            }`}
                          >
                            {formatScore(student.averageScore)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedStudent(student)
                            }
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            Chi tiết
                            <ChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                <p className="text-sm text-slate-500">
                  Hiển thị{" "}
                  {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    filteredStudents.length
                  )}{" "}
                  / {filteredStudents.length} học sinh
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setPage((previous) => previous - 1)
                    }
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span className="px-3 text-sm font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setPage((previous) => previous + 1)
                    }
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* STUDENT DETAIL MODAL */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Thông tin học sinh"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-700">
                  {getInitial(selectedStudent.name)}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedStudent.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedStudent.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <DetailStat
                label="Bài đã nộp"
                value={String(selectedStudent.submittedCount)}
              />

              <DetailStat
                label="Đã chấm"
                value={String(selectedStudent.gradedCount)}
              />

              <DetailStat
                label="Chờ chấm"
                value={String(selectedStudent.awaitingGrading)}
              />

              <DetailStat
                label="Điểm trung bình"
                value={formatScore(selectedStudent.averageScore)}
              />
            </div>

            <div className="mt-6">
              <h3 className="mb-3 font-semibold text-slate-800">
                Lớp học đang tham gia
              </h3>

              <div className="space-y-2">
                {selectedStudent.classes.map((item) => (
                  <Link
                    key={item.id}
                    href={`/teacher/classes/${item.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen
                        size={18}
                        className="text-blue-600"
                      />

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {item.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {item.code} · Khối {item.grade}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      size={17}
                      className="text-slate-400"
                    />
                  </Link>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              className="mt-6 w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Đóng
            </button>
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
  icon: typeof Users;
  color: "blue" | "purple" | "green";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-emerald-50 text-emerald-600",
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

function DetailStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}
