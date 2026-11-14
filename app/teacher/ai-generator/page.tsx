"use client";

import { useState } from "react";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";
type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "REORDER" | "MATCHING" | "WRITING" | "SPEAKING";
type Option = { label: string; content: string; isCorrect: boolean };
type Question = { content: string; type: QuestionType; explanation: string; correctAnswer: string | null; options: Option[] };
type Exercise = { title: string; description?: string; content?: string; transcript?: string; audioUrl?: string; skill?: Skill; questions: Question[]; difficulty: Difficulty };
const TYPES: { value: QuestionType; label: string }[] = [
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm" },
  { value: "TRUE_FALSE", label: "Đúng / Sai" },
  { value: "FILL_BLANK", label: "Điền từ" },
  { value: "REORDER", label: "Sắp xếp từ" },
  { value: "MATCHING", label: "Nối từ" },
];
const LISTENING_TYPES: QuestionType[] = ["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK"];
const inputClass = "mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 disabled:bg-gray-100";

export default function AIExerciseGeneratorPage() {
  const [grade, setGrade] = useState(3);
  const [skill, setSkill] = useState<Skill>("READING");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [questionCount, setQuestionCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(TYPES.map(t => t.value));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [generatedGrade, setGeneratedGrade] = useState(3);
  const [generatedSkill, setGeneratedSkill] = useState<Skill>("READING");
  const [generatedDifficulty, setGeneratedDifficulty] = useState<Difficulty>("EASY");

  function toggleType(type: QuestionType) {
    setQuestionTypes(current => current.includes(type) ? current.filter(t => t !== type) : [...current, type]);
  }

  async function generate() {
    const selectedTypes = skill === "WRITING" ? ["WRITING"] : skill === "SPEAKING" ? ["SPEAKING"] : questionTypes.filter(t => skill === "READING" || LISTENING_TYPES.includes(t));
    if (!topic.trim() || selectedTypes.length === 0) { setError("Nhập chủ đề và chọn ít nhất một dạng câu hỏi."); return; }
    setLoading(true); setError(""); setExercise(null); setShowAnswers(false); setSavedId(null); setSaveError("");
    try {
      const response = await fetch(skill === "LISTENING" ? "/api/ai/listening/generate" : skill === "WRITING" ? "/api/ai/writing/generate" : skill === "SPEAKING" ? "/api/ai/speaking/generate" : "/api/ai/generate", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, topic: topic.trim(), skill, difficulty, questionCount, questionTypes: selectedTypes }),
      });
      const raw = await response.text();
      let data: { success?: boolean; error?: string; exercise?: Exercise };
      try { data = JSON.parse(raw); } catch { throw new Error("API không trả về JSON hợp lệ."); }
      if (!response.ok || !data.success || !data.exercise || !Array.isArray(data.exercise.questions)) {
        throw new Error(data.error || `Tạo bài tập thất bại (HTTP ${response.status}).`);
      }
      setExercise(data.exercise);
      setGeneratedGrade(grade);
      setGeneratedSkill(skill);
      setGeneratedDifficulty(difficulty);
    } catch (e) { setError(e instanceof Error ? e.message : "Có lỗi xảy ra."); }
    finally { setLoading(false); }
  }

  async function saveExercise() {
    if (!exercise || saving || savedId) return;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/ai/save", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: generatedGrade, difficulty: generatedDifficulty, exercise: { ...exercise, skill: generatedSkill } }),
      });
      const raw = await response.text();
      let data: { success?: boolean; exerciseId?: string; error?: string; validationErrors?: string[] };
      try { data = JSON.parse(raw); } catch { throw new Error("API lưu không trả JSON hợp lệ."); }
      if (!response.ok || !data.success || !data.exerciseId) {
        throw new Error([data.error, ...(data.validationErrors || [])].filter(Boolean).join(" ") || "Lưu thất bại.");
      }
      setSavedId(data.exerciseId);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Không thể lưu bài tập.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="min-h-screen bg-gray-50 p-4 md:p-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <header><h1 className="text-3xl font-bold text-gray-900">AI Exercise Generator</h1>
        <p className="mt-2 text-gray-600">Tạo bài Reading, Listening, Writing hoặc Speaking bằng AI theo khối lớp và chủ đề.</p></header>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-semibold">Cấu hình bài tập</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="font-medium">Khối lớp<select className={inputClass} value={grade} disabled={loading} onChange={e => setGrade(Number(e.target.value))}>{Array.from({ length: 9 }, (_, i) => i + 1).map(g => <option key={g} value={g}>Lớp {g}</option>)}</select></label>
          <label className="font-medium">Kỹ năng<select className={inputClass} disabled={loading} value={skill} onChange={e => { const next = e.target.value as Skill; setSkill(next); setExercise(null); setSavedId(null); setQuestionTypes(next === "LISTENING" ? [...LISTENING_TYPES] : next === "WRITING" ? ["WRITING"] : next === "SPEAKING" ? ["SPEAKING"] : TYPES.map(t => t.value)); }}><option value="READING">Reading - Đọc hiểu</option><option value="LISTENING">Listening - Nghe hiểu</option><option value="WRITING">Writing - Viết</option><option value="SPEAKING">Speaking - Nói</option></select></label>
          <label className="font-medium md:col-span-2">Chủ đề<input className={inputClass} value={topic} maxLength={100} disabled={loading} onChange={e => setTopic(e.target.value)} placeholder="Animals, Family, School..." /></label>
          <label className="font-medium">Độ khó<select className={inputClass} value={difficulty} disabled={loading} onChange={e => setDifficulty(e.target.value as Difficulty)}><option value="EASY">Dễ</option><option value="MEDIUM">Trung bình</option><option value="HARD">Khó</option></select></label>
          <label className="font-medium">{skill === "WRITING" ? "Số đề viết" : skill === "SPEAKING" ? "Số đề nói" : "Số câu hỏi"}<select className={inputClass} value={questionCount} disabled={loading} onChange={e => setQuestionCount(Number(e.target.value))}>{Array.from({ length: skill === "WRITING" || skill === "SPEAKING" ? 5 : 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} câu hỏi</option>)}</select></label>
        </div>
        {skill !== "WRITING" && skill !== "SPEAKING" && <fieldset className="mt-6"><legend className="mb-3 font-semibold">Dạng câu hỏi (chọn nhiều)</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{TYPES.filter(t => skill === "READING" || LISTENING_TYPES.includes(t.value)).map(t => <label key={t.value} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" disabled={loading} checked={questionTypes.includes(t.value)} onChange={() => toggleType(t.value)} className="h-4 w-4" />{t.label}</label>)}</div>
          {questionTypes.length > questionCount && <p className="mt-2 text-sm text-amber-700">Số dạng đã chọn lớn hơn số câu hỏi: không thể xuất hiện đủ mọi dạng trong một đề.</p>}
        </fieldset>}
        <button type="button" disabled={loading || !topic.trim() || (skill !== "WRITING" && skill !== "SPEAKING" && questionTypes.length === 0)} onClick={generate} className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? "AI đang tạo bài tập..." : "✨ Tạo bài tập bằng AI"}</button>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      </section>
      {loading && <section className="rounded-xl border bg-white p-6 text-center">Đang tạo bài tập, vui lòng chờ...</section>}
      {exercise && !loading && <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">{exercise.title}</h2><p className="mt-2 text-gray-600">{exercise.description}</p><p className="mt-2 text-sm text-gray-500">Lớp {generatedGrade} · {generatedSkill === "LISTENING" ? "Listening" : generatedSkill === "WRITING" ? "Writing" : generatedSkill === "SPEAKING" ? "Speaking" : "Reading"} · {exercise.questions.length} câu hỏi</p></section>
        {generatedSkill === "SPEAKING" ? <section className="rounded-2xl border bg-white p-6 shadow-sm"><h3 className="mb-3 text-xl font-semibold">Speaking Instructions</h3><p className="text-sm text-gray-600">Học sinh sẽ ghi âm câu trả lời khi chức năng Speaking Exam được triển khai. Chưa có chấm điểm ở bước này.</p></section> : generatedSkill === "WRITING" ? <section className="rounded-2xl border bg-white p-6 shadow-sm"><h3 className="mb-3 text-xl font-semibold">Writing Instructions</h3><p className="text-sm text-gray-600">Học sinh viết bài bằng tiếng Anh. AI sẽ chấm theo rubric sau khi nộp bài.</p></section> : generatedSkill === "LISTENING" ? <section className="rounded-2xl border bg-white p-6 shadow-sm"><h3 className="mb-4 text-xl font-semibold">Listening Audio</h3>{exercise.audioUrl ? <audio controls preload="metadata" className="w-full" src={exercise.audioUrl}>Trình duyệt không hỗ trợ audio.</audio> : <p className="text-red-600">API chưa trả audioUrl.</p>}<h4 className="mt-5 font-semibold">Transcript (chỉ giáo viên xem)</h4><p className="mt-2 whitespace-pre-line rounded-xl bg-blue-50 p-5 leading-8">{exercise.transcript || "Chưa có transcript"}</p></section> : <section className="rounded-2xl border bg-white p-6 shadow-sm"><h3 className="mb-4 text-xl font-semibold">Reading Passage</h3><p className="whitespace-pre-line rounded-xl bg-blue-50 p-5 leading-8">{exercise.content}</p></section>}
        <section className="rounded-2xl border bg-white p-6 shadow-sm"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">Questions</h3><button type="button" disabled={generatedSkill === "WRITING" || generatedSkill === "SPEAKING"} onClick={() => setShowAnswers(v => !v)} className="rounded-lg border border-blue-600 px-4 py-2 text-blue-700 disabled:opacity-40">{showAnswers ? "Ẩn đáp án" : "Hiện đáp án"}</button></div>
          <div className="space-y-5">{exercise.questions.map((q, i) => <article key={i} className="rounded-xl border p-5">
            <p className="mb-2 text-xs font-semibold text-blue-700">{TYPES.find(t => t.value === q.type)?.label || q.type}</p>
            <h4 className="mb-3 font-semibold">Câu {i + 1}: {q.type === "REORDER" || q.type === "MATCHING" ? "" : q.content}</h4>
            {q.type === "MULTIPLE_CHOICE" && <div className="space-y-2">{q.options.map(o => <div key={o.label} className={`rounded-lg border p-3 ${showAnswers && o.isCorrect ? "border-green-400 bg-green-50" : "bg-gray-50"}`}><strong>{o.label}.</strong> {o.content}</div>)}</div>}
            {q.type === "TRUE_FALSE" && <p className="rounded-lg bg-gray-50 p-3">□ True &nbsp;&nbsp; □ False</p>}
            {q.type === "FILL_BLANK" && <p className="text-sm text-gray-500">Điền từ hoặc cụm từ thích hợp vào chỗ trống.</p>}
            {q.type === "REORDER" && <div className="flex flex-wrap gap-2">{q.content.split("|").map((part, j) => <span key={j} className="rounded-lg border bg-gray-50 px-3 py-2">{part.trim()}</span>)}</div>}
            {q.type === "MATCHING" && <div className="grid grid-cols-2 gap-4"><div className="space-y-2">{q.content.split("|").map((part, j) => <div key={j} className="rounded-lg border bg-gray-50 p-3">{j + 1}. {part.trim()}</div>)}</div><div className="space-y-2">{q.options.map(o => <div key={o.label} className="rounded-lg border bg-gray-50 p-3">{o.label}. {o.content}</div>)}</div></div>}
            {q.type === "SPEAKING" && <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Đề luyện nói: học sinh sẽ ghi âm trả lời. Chưa hỗ trợ nộp/chấm Speaking.</p>}
            {q.type === "WRITING" && <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">Bài viết tự luận: không có đáp án cố định. AI chấm theo rubric khi học sinh nộp bài.</p>}
            {showAnswers && q.type !== "WRITING" && q.type !== "SPEAKING" && <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm"><strong>Đáp án:</strong> {q.correctAnswer}<p className="mt-2"><strong>Giải thích:</strong> {q.explanation}</p></div>}
          </article>)}</div>
        </section>
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          {savedId ? <div className="space-y-2"><p className="font-semibold text-green-700">Đã lưu bài tập vào cơ sở dữ liệu!</p><a className="inline-block rounded-lg bg-green-600 px-4 py-2 text-white" href={`/teacher/exercises/${savedId}`}>Xem bài tập đã lưu</a></div> : <button type="button" onClick={saveExercise} disabled={saving} className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu vào ngân hàng bài tập"}</button>}
          {saveError && <p role="alert" className="mt-3 text-red-700">{saveError}</p>}
        </section>
        <div className="flex gap-3"><button type="button" onClick={generate} className="rounded-lg bg-blue-600 px-5 py-3 text-white">Tạo lại bài tập</button><button type="button" onClick={() => setExercise(null)} className="rounded-lg border px-5 py-3">Xóa xem trước</button></div>
        {!savedId && <p className="text-sm text-gray-500">Đây là bản xem trước; nhấn Lưu để ghi vào cơ sở dữ liệu.</p>}
      </div>}
    </div>
  </div>;
}
