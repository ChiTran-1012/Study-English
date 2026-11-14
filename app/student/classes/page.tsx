
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Users,
  UserRound,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  School,
} from "lucide-react";

type StudentClass = {
  id: string;
  name: string;
  code: string;
  grade: number;
  description?: string | null;
  teacher?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  _count?: {
    members?: number;
    assignments?: number;
  };
};

function parseClasses(data: unknown): StudentClass[] {
  if (Array.isArray(data)) {
    return data as StudentClass[];
  }

  if (data && typeof data === "object") {
    const result = data as {
      classes?: unknown;
      data?: unknown;
    };

    if (Array.isArray(result.classes)) {
      return result.classes as StudentClass[];
    }

    if (Array.isArray(result.data)) {
      return result.data as StudentClass[];
    }
  }

  throw new Error("API trả về danh sách lớp không hợp lệ");
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadClasses = useCallback(async () => {
    try {
      const response = await fetch("/api/student/classes", {
        cache: "no-store",
      });

      const text = await response.text();

      let data: unknown;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error("API không trả về JSON hợp lệ");
      }

      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Không thể tải danh sách lớp";

        throw new Error(message);
      }

      setClasses(parseClasses(data));
      setError("");
    } catch (err) {
      console.error("LOAD STUDENT CLASSES ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi tải lớp học"
      );

      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadClasses());
  }, [loadClasses]);

  const refreshClasses = useCallback(() => {
    setLoading(true);
    setError("");
    void loadClasses();
  }, [loadClasses]);

  const filteredClasses = classes.filter((item) => {
    const keyword = search.trim().toLowerCase();

    return (
      item.name.toLowerCase().includes(keyword) ||
      item.code.toLowerCase().includes(keyword) ||
      String(item.grade).includes(keyword) ||
      (item.teacher?.name ?? "")
        .toLowerCase()
        .includes(keyword)
    );
  });

  const totalClasses = classes.length;

  const totalAssignments = classes.reduce(
    (sum, item) => sum + (item._count?.assignments ?? 0),
    0
  );

  const totalTeachers = new Set(
    classes
      .map((item) => item.teacher?.id)
      .filter((id): id is string => Boolean(id))
  ).size;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-6">
          <div>
            <p className="text-sm text-slate-500">
              Student Portal
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-800">
              My Classes
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Xem và quản lý các lớp học bạn đã tham gia.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshClasses}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Làm mới
          </button>
        </div>
      </header>

      <main className="space-y-8 p-8">
        {/* Intro */}
        <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-7 text-white">
          <div className="flex items-center gap-3">
            <School size={32} />

            <div>
              <h2 className="text-2xl font-bold">
                Lớp học của tôi
              </h2>

              <p className="mt-2 text-sm text-blue-100">
                Theo dõi lớp học, giáo viên và các bài tập
                được giao.
              </p>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            title="Lớp đang tham gia"
            value={totalClasses}
            icon={<GraduationCap size={24} />}
          />

          <StatCard
            title="Giáo viên"
            value={totalTeachers}
            icon={<UserRound size={24} />}
          />

          <StatCard
            title="Bài tập được giao"
            value={totalAssignments}
            icon={<BookOpen size={24} />}
          />
        </section>

        {/* Search */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="class-search"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Tìm kiếm lớp học
          </label>

          <input
            id="class-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nhập tên lớp, mã lớp hoặc giáo viên..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={refreshClasses}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Class list */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Danh sách lớp học
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredClasses.length} lớp học
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-white p-12 text-center">
              <RefreshCw
                size={30}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-4 text-slate-500">
                Đang tải danh sách lớp...
              </p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="rounded-2xl border bg-white p-12 text-center">
              <School
                size={44}
                className="mx-auto text-slate-400"
              />

              <h3 className="mt-4 text-lg font-bold text-slate-700">
                {search
                  ? "Không tìm thấy lớp học"
                  : "Bạn chưa tham gia lớp học nào"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "Hãy thử từ khóa tìm kiếm khác."
                  : "Hãy liên hệ giáo viên để được thêm vào lớp."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filteredClasses.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <GraduationCap size={28} />
                    </div>

                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      Khối {item.grade}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-slate-800">
                    {item.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Mã lớp: {item.code}
                  </p>

                  {item.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                    <InfoRow
                      icon={<UserRound size={17} />}
                      label="Giáo viên"
                      value={item.teacher?.name ?? "Chưa cập nhật"}
                    />

                    <InfoRow
                      icon={<Users size={17} />}
                      label="Học sinh"
                      value={
                        item._count?.members != null
                          ? String(item._count.members)
                          : "Chưa có dữ liệu"
                      }
                    />

                    <InfoRow
                      icon={<BookOpen size={17} />}
                      label="Bài tập"
                      value={
                        item._count?.assignments != null
                          ? String(item._count.assignments)
                          : "Chưa có dữ liệu"
                      }
                    />
                  </div>

                  <div className="mt-6">
                    <Link
                      href="/student/assignments"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Xem bài tập
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <p className="mt-2 text-3xl font-bold text-slate-800">
            {value}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span>{label}</span>
      </div>

      <span className="text-right font-semibold text-slate-700">
        {value}
      </span>
    </div>
  );
}
