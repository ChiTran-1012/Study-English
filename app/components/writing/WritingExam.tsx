"use client";

import Link from "next/link";
import { useMemo } from "react";

type WritingQuestion = { id: string; content: string; order: number; type: string };

type Props = {
  title: string;
  description?: string | null;
  questions: WritingQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, answer: string) => void;
  onSubmit: () => void | Promise<void>;
  submitting: boolean;
  submitted: boolean;
};

function countWords(value: string): number {
  const text = value.trim();
  return text ? text.split(/\s+/u).length : 0;
}

export default function WritingExam({
  title, description, questions, answers, onAnswer, onSubmit, submitting, submitted,
}: Props) {
  const writingQuestions = useMemo(
    () => questions.filter((question) => question.type === "WRITING"),
    [questions]
  );
  const completed = writingQuestions.filter((q) => countWords(answers[q.id] ?? "") > 0).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/student/assignments" className="text-sm font-medium text-blue-700 hover:underline">
          ← Quay lại danh sách bài tập
        </Link>
        <header className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-7 text-white shadow-sm">
          <p className="text-sm text-blue-100">English Writing Practice</p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{title}</h1>
          {description && <p className="mt-3 whitespace-pre-wrap text-blue-100">{description}</p>}
          <p className="mt-4 text-sm text-blue-100">Hoàn thành {completed}/{writingQuestions.length} đề viết</p>
        </header>

        {writingQuestions.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
            Bài Writing chưa có câu hỏi loại WRITING. Vui lòng liên hệ giáo viên.
          </div>
        )}

        {writingQuestions.map((question, index) => {
          const answer = answers[question.id] ?? "";
          const words = countWords(answer);
          return (
            <section key={question.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">Đề Writing {index + 1}</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Tự luận</span>
              </div>
              <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-5 leading-7 text-slate-800">{question.content}</p>
              <label htmlFor={`writing-${question.id}`} className="mt-6 block text-sm font-semibold text-slate-800">
                Bài viết của bạn
              </label>
              <textarea
                id={`writing-${question.id}`}
                value={answer}
                onChange={(event) => onAnswer(question.id, event.target.value)}
                disabled={submitting || submitted}
                rows={12}
                maxLength={20000}
                placeholder="Write your answer in English here..."
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-4 leading-7 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
              <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                <span>Kiểm tra nội dung, chính tả và ngữ pháp trước khi nộp.</span>
                <span className="shrink-0 font-medium">{words} từ</span>
              </div>
            </section>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Bài viết sẽ được AI đánh giá theo rubric sau khi nộp.</p>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={submitting || submitted || writingQuestions.length === 0 || completed !== writingQuestions.length}
            className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Đang nộp bài..." : submitted ? "Đã nộp" : "Nộp bài Writing"}
          </button>
        </div>
      </div>
    </main>
  );
}
