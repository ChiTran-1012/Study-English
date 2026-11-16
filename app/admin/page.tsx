import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ClipboardList,
  FileText,
  GraduationCap,
  Layers3,
  UsersRound,
} from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/require-admin";

const roleLabels: Record<string, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học sinh",
};

const roleStyles: Record<string, string> = {
  ADMIN: "bg-violet-50 text-violet-700",
  TEACHER: "bg-sky-50 text-sky-700",
  STUDENT: "bg-emerald-50 text-emerald-700",
};

const fileStatusLabels: Record<string, string> = {
  PENDING: "Chờ xử lý",
  PROCESSING: "Đang OCR",
  COMPLETED: "Sẵn sàng",
  FAILED: "Cần kiểm tra",
};

const fileStatusStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-rose-50 text-rose-700",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(date);
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join("");
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const [studentCount, teacherCount, adminCount, classCount, exerciseCount, assignmentCount, textbookCount, fileCount, latestUsers, recentFiles, recentClasses] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.class.count(),
    prisma.exercise.count(),
    prisma.assignment.count(),
    prisma.textbook.count(),
    prisma.textbookFile.count(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.textbookFile.findMany({
      select: { id: true, displayName: true, grade: true, status: true, createdAt: true, textbook: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.class.findMany({
      select: { id: true, name: true, grade: true, teacher: { select: { name: true } }, _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const totalUsers = studentCount + teacherCount + adminCount;
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date());

  const mainStats = [
    { label: "Tổng tài khoản", value: totalUsers, hint: "Tất cả vai trò", icon: UsersRound, tone: "bg-indigo-50 text-indigo-700", trend: "Hệ thống" },
    { label: "Học sinh", value: studentCount, hint: "Đang học trên hệ thống", icon: GraduationCap, tone: "bg-emerald-50 text-emerald-700", trend: "Người học" },
    { label: "Giáo viên", value: teacherCount, hint: "Tài khoản giảng dạy", icon: UsersRound, tone: "bg-sky-50 text-sky-700", trend: "Giảng dạy" },
    { label: "Lớp học", value: classCount, hint: "Không gian học tập", icon: Layers3, tone: "bg-amber-50 text-amber-700", trend: "Lớp học" },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#172848] via-[#1b3154] to-[#234c70] px-6 py-7 text-white shadow-xl shadow-slate-300/40 sm:px-9 sm:py-9">
        <div className="absolute -right-10 -top-24 size-72 rounded-full border border-white/10" />
        <div className="absolute -right-2 -top-16 size-56 rounded-full border border-white/10" />
        <div className="absolute bottom-[-90px] right-[23%] size-44 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-cyan-100">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              Bảng điều khiển quản trị
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-[38px]">Xin chào, {admin.name} 👋</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Theo dõi hoạt động dạy và học, tài khoản cùng học liệu trên Study English.</p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm md:min-w-[230px]">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-300">Hôm nay</p>
              <p className="mt-1 text-sm font-semibold capitalize text-white">{today}</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-cyan-200"><ClipboardList size={19} /></div>
          </div>
        </div>
      </section>

      <section aria-label="Thống kê tổng quan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {mainStats.map(({ label, value, hint, icon: Icon, tone, trend }) => (
          <article key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value.toLocaleString("vi-VN")}</p>
              </div>
              <div className={`flex size-11 items-center justify-center rounded-2xl ${tone}`}><Icon size={21} /></div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
              <p className="text-xs text-slate-500">{hint}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><ArrowUpRight size={13} />{trend}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">Tài khoản mới</h2>
              <p className="mt-1 text-xs text-slate-500">5 tài khoản đăng ký gần đây</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{totalUsers.toLocaleString("vi-VN")} tài khoản</span>
          </div>
          {latestUsers.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">Chưa có tài khoản nào.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {latestUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-cyan-100 text-xs font-bold text-indigo-700">{initials(user.name)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${roleStyles[user.role] ?? "bg-slate-100 text-slate-600"}`}>{roleLabels[user.role] ?? user.role}</span>
                    <p className="mt-1.5 text-[11px] text-slate-400">{formatDate(user.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold sm:hidden ${roleStyles[user.role] ?? "bg-slate-100 text-slate-600"}`}>{roleLabels[user.role] ?? user.role}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900">Học liệu</h2>
              <p className="mt-1 text-xs text-slate-500">Sách giáo khoa và tài liệu OCR</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><BookOpen size={19} /></div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Bộ sách</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{textbookCount.toLocaleString("vi-VN")}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Tài liệu PDF</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{fileCount.toLocaleString("vi-VN")}</p>
            </div>
          </div>
          <Link href="/admin/textbooks" className="mt-4 flex items-center justify-between rounded-xl border border-cyan-100 bg-cyan-50/70 px-4 py-3.5 transition hover:border-cyan-200 hover:bg-cyan-50">
            <span className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white text-cyan-700 shadow-sm"><FileText size={17} /></span>
              <span><span className="block text-sm font-semibold text-slate-800">Quản lý sách giáo khoa</span><span className="mt-0.5 block text-xs text-slate-500">Upload PDF và xử lý OCR</span></span>
            </span>
            <ArrowRight size={17} className="text-cyan-700" />
          </Link>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Nội dung học tập</span>
              <span className="font-semibold text-slate-700">{exerciseCount} bài tập · {assignmentCount} bài giao</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">Bài tập được tạo bởi giáo viên và AI, phục vụ các lớp học trên hệ thống.</p>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
            <div><h2 className="font-bold text-slate-900">Lớp học gần đây</h2><p className="mt-1 text-xs text-slate-500">Các lớp vừa được tạo</p></div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><GraduationCap size={20} /></div>
          </div>
          {recentClasses.length ? <div className="divide-y divide-slate-100">
            {recentClasses.map((classroom) => <div key={classroom.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Layers3 size={18} /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{classroom.name}</p><p className="mt-0.5 text-xs text-slate-500">Lớp {classroom.grade} · {classroom.teacher.name}</p></div>
              <span className="whitespace-nowrap text-xs font-medium text-slate-500">{classroom._count.members} học sinh</span>
            </div>)}
          </div> : <p className="px-6 py-10 text-center text-sm text-slate-500">Chưa có lớp học nào.</p>}
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
            <div><h2 className="font-bold text-slate-900">Tài liệu mới cập nhật</h2><p className="mt-1 text-xs text-slate-500">Trạng thái xử lý OCR mới nhất</p></div>
            <Link href="/admin/textbooks" aria-label="Mở quản lý sách giáo khoa" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><ArrowUpRight size={18} /></Link>
          </div>
          {recentFiles.length ? <div className="divide-y divide-slate-100">
            {recentFiles.map((file) => <div key={file.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><FileText size={18} /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{file.displayName}</p><p className="mt-0.5 truncate text-xs text-slate-500">{file.textbook.name} · Lớp {file.grade}</p></div>
              <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${fileStatusStyles[file.status] ?? "bg-slate-100 text-slate-600"}`}>{fileStatusLabels[file.status] ?? file.status}</span>
            </div>)}
          </div> : <p className="px-6 py-10 text-center text-sm text-slate-500">Chưa có tài liệu PDF. Hãy tải tài liệu đầu tiên lên.</p>}
        </article>
      </section>
    </div>
  );
}
