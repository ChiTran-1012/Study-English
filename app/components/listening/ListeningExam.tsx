"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type Option = { id: string; label: string; content: string };
type Question = { id: string; content: string; type: string; order: number; options?: Option[] };
type Props = {
  title: string;
  audioUrl?: string | null;
  questions: Question[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, value: string) => void;
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
  submitted?: boolean;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export default function ListeningExam({ title, audioUrl, questions, answers, onAnswer, onSubmit, submitting = false, submitted = false }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const current = questions[active];
  const answered = questions.filter(q => Boolean(answers[q.id]?.trim())).length;

  function toggleAudio() {
    const player = audioRef.current;
    if (!player || !audioUrl) return;
    if (player.paused) void player.play().catch(() => setPlaying(false));
    else player.pause();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Study-English · Listening Test</p>
            <h1 className="mt-1 text-xl font-bold">{title}</h1>
          </div>
          <Link href="/student/assignments" className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50">← Danh sách bài tập</Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px] md:px-8">
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">Listening Audio</h2>
                <p className="text-sm text-slate-500">Listen carefully and answer the questions.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Listening</span>
            </div>
            {audioUrl ? (
              <>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  preload="metadata"
                  onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
                  onTimeUpdate={e => setPosition(e.currentTarget.currentTime)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  onError={() => setPlaying(false)}
                />
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
                  <button type="button" onClick={toggleAudio} className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">{playing ? "❚❚ Pause" : "▶ Play"}</button>
                  <span className="min-w-20 text-sm tabular-nums text-slate-600">{formatTime(position)} / {formatTime(duration)}</span>
                  <input aria-label="Tua âm thanh" type="range" min={0} max={Number.isFinite(duration) && duration > 0 ? duration : 1} step={0.1} value={Math.min(position, Number.isFinite(duration) && duration > 0 ? duration : 1)} onChange={e => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="min-w-32 flex-1 accent-blue-700" />
                  <label className="flex items-center gap-2 text-sm">Speed
                    <select value={rate} onChange={e => { const next = Number(e.target.value); setRate(next); if (audioRef.current) audioRef.current.playbackRate = next; }} className="rounded-lg border bg-white px-2 py-2">
                      <option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option>
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Bài Listening chưa có audioUrl. Giáo viên cần tạo hoặc tải lên tệp âm thanh trước khi học sinh làm bài.</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {current ? (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                  <h2 className="font-bold">Question {active + 1} <span className="font-normal text-slate-500">of {questions.length}</span></h2>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{current.type.replaceAll("_", " ")}</span>
                </div>
                <p className="mb-5 text-lg font-medium leading-relaxed">{current.content}</p>
                {["FILL_BLANK", "REORDER", "MATCHING"].includes(current.type) ? (
                  <div>
                    <label htmlFor="listening-answer" className="mb-2 block text-sm text-slate-600">{current.type === "MATCHING" ? "Nhập cặp ghép, ví dụ: 1-B,2-A" : "Nhập câu trả lời"}</label>
                    <input id="listening-answer" className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600" value={answers[current.id] ?? ""} onChange={e => onAnswer(current.id, e.target.value)} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(current.options?.length ? current.options.map(o => ({ value: o.id, label: `${o.label}. ${o.content}` })) : current.type === "TRUE_FALSE" ? [{ value: "True", label: "True" }, { value: "False", label: "False" }] : []).map(option => (
                      <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${answers[current.id] === option.value ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                        <input type="radio" name={`question-${current.id}`} checked={answers[current.id] === option.value} onChange={() => onAnswer(current.id, option.value)} className="accent-blue-700" />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}
                <div className="mt-8 flex justify-between border-t pt-5">
                  <button type="button" onClick={() => setActive(i => Math.max(0, i - 1))} disabled={active === 0} className="rounded-lg border px-5 py-2 font-medium disabled:opacity-40">← Previous</button>
                  <button type="button" onClick={() => setActive(i => Math.min(questions.length - 1, i + 1))} disabled={active === questions.length - 1} className="rounded-lg bg-blue-700 px-5 py-2 font-medium text-white disabled:opacity-40">Next →</button>
                </div>
              </>
            ) : <p>Chưa có câu hỏi cho bài Listening này.</p>}
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h2 className="font-bold">Question Navigator</h2>
          <p className="mt-1 text-sm text-slate-500">Đã trả lời {answered}/{questions.length} câu</p>
          <div className="my-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-700" style={{ width: `${questions.length ? answered / questions.length * 100 : 0}%` }} /></div>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, i) => <button key={q.id} type="button" aria-label={`Đến câu ${i + 1}`} onClick={() => setActive(i)} className={`aspect-square rounded-lg border text-sm font-semibold ${i === active ? "border-blue-700 ring-2 ring-blue-200" : "border-slate-200"} ${answers[q.id]?.trim() ? "bg-blue-700 text-white" : "bg-white text-slate-700"}`}>{i + 1}</button>)}
          </div>
          <div className="mt-5 space-y-2 border-t pt-4 text-xs text-slate-500">
            <p><span className="mr-2 inline-block h-3 w-3 rounded bg-blue-700" />Đã trả lời</p>
            <p><span className="mr-2 inline-block h-3 w-3 rounded border border-slate-300 bg-white" />Chưa trả lời</p>
          </div>
          <button type="button" onClick={() => void onSubmit()} disabled={submitting || submitted || questions.length === 0 || !audioUrl} className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Đang nộp..." : submitted ? "Đã nộp" : "Submit Answers"}</button>
          {!audioUrl && <p className="mt-2 text-xs text-amber-700">Cần có audio để mở nút nộp bài.</p>}
        </aside>
      </main>
    </div>
  );
}
