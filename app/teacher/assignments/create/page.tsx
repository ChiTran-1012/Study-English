"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, BookOpen, CalendarDays, CheckCircle2, GraduationCap, Loader2, RefreshCw, Send } from "lucide-react";

type Exercise = { id: string; title: string; skill: string; difficulty: string };
type ClassItem = { id: string; name: string; code: string; grade: number };

const skillNames: Record<string, string> = {
  READING: "Reading", LISTENING: "Listening", SPEAKING: "Speaking", WRITING: "Writing",
};
const difficultyNames: Record<string, string> = {
  EASY: "Dễ", MEDIUM: "Trung bình", HARD: "Khó",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) throw new Error(`API không trả về dữ liệu (HTTP ${response.status}).`);
  let data: unknown;
  try { data = JSON.parse(text); }
  catch { throw new Error(`API không trả về JSON hợp lệ (HTTP ${response.status}). Hãy kiểm tra đường dẫn API.`); }
  if (!response.ok) {
    const message = isRecord(data) && typeof data.message === "string"
      ? data.message
      : isRecord(data) && typeof data.error === "string"
        ? data.error
        : `Yêu cầu thất bại (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return data;
}

function getList(data: unknown, key: "exercises" | "classes"): unknown[] {
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data[key])) return data[key];
  throw new Error(`API ${key} trả về cấu trúc không hợp lệ.`);
}

function localDateTimeToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [exerciseId, setExerciseId] = useState("");
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const [exerciseResponse, classResponse] = await Promise.all([
        fetch("/api/exercises", { cache: "no-store", signal }),
        fetch("/api/classes", { cache: "no-store", signal }),
      ]);
      const [exerciseData, classData] = await Promise.all([
        readJson(exerciseResponse), readJson(classResponse),
      ]);
      const exerciseItems = getList(exerciseData, "exercises");
      const classItems = getList(classData, "classes");
      if (!exerciseItems.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.skill === "string" && typeof item.difficulty === "string")) {
        throw new Error("Danh sách bài tập không đúng định dạng.");
      }
      if (!classItems.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.name === "string" && typeof item.code === "string" && typeof item.grade === "number")) {
        throw new Error("Danh sách lớp học không đúng định dạng.");
      }
      if (signal?.aborted) return;
      setExercises(exerciseItems as Exercise[]);
      setClasses(classItems as ClassItem[]);
    } catch (err) {
      if (signal?.aborted) return;
      console.error("LOAD ASSIGNMENT FORM ERROR:", err);
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadData(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadData]);

  const selectedExercise = useMemo(() => exercises.find((item) => item.id === exerciseId), [exercises, exerciseId]);
  const selectedClass = useMemo(() => classes.find((item) => item.id === classId), [classes, classId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (!exerciseId || !exercises.some((item) => item.id === exerciseId)) {
      setError("Vui lòng chọn bài tập hợp lệ."); return;
    }
    if (!classId || !classes.some((item) => item.id === classId)) {
      setError("Vui lòng chọn lớp học hợp lệ."); return;
    }
    const startDate = startAt ? new Date(startAt) : new Date();
    const dueDate = dueAt ? new Date(dueAt) : null;
    if (Number.isNaN(startDate.getTime()) || (dueDate && Number.isNaN(dueDate.getTime()))) {
      setError("Ngày bắt đầu hoặc hạn nộp không hợp lệ."); return;
    }
    if (dueDate && dueDate <= startDate) {
      setError("Hạn nộp phải sau ngày bắt đầu (hoặc thời điểm hiện tại nếu không chọn ngày bắt đầu)."); return;
    }
    try {
      setSaving(true);
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId, classId, title: title.trim(), description: description.trim(),
          startAt: startAt ? localDateTimeToIso(startAt) : null,
          dueAt: dueAt ? localDateTimeToIso(dueAt) : null,
        }),
      });
      const data = await readJson(response);
      if (!isRecord(data) || typeof data.id !== "string") {
        throw new Error("API không trả về Assignment đã tạo. Vui lòng kiểm tra danh sách trước khi thử lại.");
      }
      router.push("/teacher/assignments");
      router.refresh();
    } catch (err) {
      console.error("CREATE ASSIGNMENT ERROR:", err);
      setError(err instanceof Error ? err.message : "Không thể giao bài tập.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/teacher/assignments" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600">
          <ArrowLeft size={17} /> Quay lại danh sách bài giao
        </Link>
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-blue-600">Teacher Portal / Assignments</p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Giao bài tập cho lớp</h1>
            <p className="mt-2 text-sm text-slate-500">Chọn bài tập, lớp học và thiết lập thời hạn hoàn thành.</p>
          </div>
          <button type="button" onClick={() => void loadData()} disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} /> Tải lại dữ liệu
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-24 text-slate-600">
            <Loader2 className="animate-spin text-blue-600" /> Đang tải danh sách bài tập và lớp học...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><BookOpen size={21} /></div>
                <div><h2 className="font-bold text-slate-800">1. Chọn nội dung giao bài</h2><p className="text-sm text-slate-500">Bài tập và lớp học thuộc tài khoản giáo viên.</p></div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="exercise" className="text-sm font-semibold text-slate-700">Bài tập <span className="text-red-500">*</span></label>
                  <select id="exercise" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} required className={inputClass}>
                    <option value="">-- Chọn bài tập --</option>
                    {exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.title} — {skillNames[exercise.skill] || exercise.skill} — {difficultyNames[exercise.difficulty] || exercise.difficulty}</option>)}
                  </select>
                  {exercises.length === 0 && <p className="mt-2 text-sm text-amber-700">Chưa có bài tập. <Link href="/teacher/exercises/create" className="font-semibold underline">Tạo bài tập</Link> trước khi giao.</p>}
                </div>
                <div>
                  <label htmlFor="class" className="text-sm font-semibold text-slate-700">Lớp học <span className="text-red-500">*</span></label>
                  <select id="class" value={classId} onChange={(e) => setClassId(e.target.value)} required className={inputClass}>
                    <option value="">-- Chọn lớp --</option>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.code} — Khối {item.grade}</option>)}
                  </select>
                  {classes.length === 0 && <p className="mt-2 text-sm text-amber-700">Chưa có lớp học. <Link href="/teacher/classes/create" className="font-semibold underline">Tạo lớp</Link> trước khi giao.</p>}
                </div>
              </div>
              {(selectedExercise || selectedClass) && (
                <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="flex items-start gap-2"><BookOpen size={17} className="mt-0.5 text-blue-600" /><span>{selectedExercise ? `${selectedExercise.title} · ${skillNames[selectedExercise.skill] || selectedExercise.skill}` : "Chưa chọn bài tập"}</span></div>
                  <div className="flex items-start gap-2"><GraduationCap size={17} className="mt-0.5 text-purple-600" /><span>{selectedClass ? `${selectedClass.name} · Khối ${selectedClass.grade}` : "Chưa chọn lớp"}</span></div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="mb-5 font-bold text-slate-800">2. Thông tin bài giao</h2>
              <div className="space-y-5">
                <div><label htmlFor="title" className="text-sm font-semibold text-slate-700">Tiêu đề (không bắt buộc)</label>
                  <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={selectedExercise?.title || "Ví dụ: Bài Reading tuần 1"} className={inputClass} />
                  <p className="mt-1 text-xs text-slate-500">Để trống sẽ sử dụng tên bài tập đã chọn.</p>
                </div>
                <div><label htmlFor="description" className="text-sm font-semibold text-slate-700">Hướng dẫn học sinh</label>
                  <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} placeholder="Nhập yêu cầu, lưu ý hoặc hướng dẫn làm bài..." className={inputClass} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><CalendarDays size={21} /></div><div><h2 className="font-bold text-slate-800">3. Thời gian thực hiện</h2><p className="text-sm text-slate-500">Thời gian được nhập theo múi giờ trên thiết bị của bạn.</p></div></div>
              <div className="grid gap-5 md:grid-cols-2">
                <div><label htmlFor="startAt" className="text-sm font-semibold text-slate-700">Bắt đầu</label><input id="startAt" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputClass} /><p className="mt-1 text-xs text-slate-500">Để trống: bắt đầu ngay khi giao.</p></div>
                <div><label htmlFor="dueAt" className="text-sm font-semibold text-slate-700">Hạn nộp</label><input id="dueAt" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputClass} /><p className="mt-1 text-xs text-slate-500">Để trống: không giới hạn hạn nộp.</p></div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="flex items-center gap-2 text-sm text-slate-500"><CheckCircle2 size={17} className="text-emerald-600" /> Vui lòng kiểm tra bài tập và lớp trước khi giao.</p>
              <div className="flex gap-3"><Link href="/teacher/assignments" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</Link>
                <button type="submit" disabled={saving || !exerciseId || !classId || exercises.length === 0 || classes.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}{saving ? "Đang giao bài..." : "Giao bài tập"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
