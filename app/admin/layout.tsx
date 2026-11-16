"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import LogoutButton from "@/app/components/logout-button";

const navigation = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/textbooks", label: "Sách giáo khoa", icon: BookOpen },
];

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-[84px] items-center gap-3 border-b border-white/10 px-6">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/20">
          <BookOpen size={22} strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-bold tracking-tight text-white">Study English</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Admin console</p>
        </div>
      </div>

      <div className="px-4 pt-7">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Không gian làm việc</p>
        <nav aria-label="Điều hướng quản trị" className="mt-3 space-y-1.5">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/20"
                    : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={16} />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-200">
              <ShieldCheck size={19} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Quản trị viên</p>
              <p className="mt-0.5 text-xs text-slate-400">Toàn quyền hệ thống</p>
            </div>
          </div>
          <div className="mt-4 border-t border-white/10 pt-3 text-slate-200">
            <LogoutButton />
          </div>
        </div>
        <p className="px-2 pt-4 text-[11px] text-slate-500">Study English · Admin</p>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const current = navigation.find((item) => item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href));

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-[#101b32] transition-transform duration-200 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="absolute right-3 top-5 md:hidden">
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <AdminSidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="min-h-screen md:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Mở menu" className="rounded-xl border border-slate-200 p-2 text-slate-600 md:hidden">
              <Menu size={19} />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline">Quản trị</span>
              <ChevronRight size={14} className="hidden text-slate-300 sm:block" />
              <span className="truncate font-semibold text-slate-800">{current?.label ?? "Study English"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-semibold text-slate-700">Khu vực quản trị</span>
              <span className="block text-[11px] text-slate-400">Hệ thống học tập</span>
            </span>
            <div className="flex size-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">AD</div>
          </div>
        </header>
        <main className="p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
