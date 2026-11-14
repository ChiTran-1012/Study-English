
"use client";

import { useState } from "react";

type Scores = {
  pronunciationScore: number | null;
  fluencyScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;
};

type Props = {
  assignmentId: string;
  submissionId: string;
  recordId: string;
  questionId: string;

  initialScores?: Partial<Scores>;
  initialFeedback?: string;
  onSaved?: () => void;
};

function parseScore(value: string): number | null {
  if (!value.trim()) return null;

  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const number = Number(normalized);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    number > 10
  ) {
    return null;
  }

  return number;
}

export default function TeacherSpeakingGrading({
  assignmentId,
  submissionId,
  recordId,
  questionId,
  initialScores,
  initialFeedback = "",
  onSaved,
}: Props) {
  const [pronunciation, setPronunciation] = useState(() =>
    initialScores?.pronunciationScore == null
      ? ""
      : String(initialScores.pronunciationScore)
  );
  const [fluency, setFluency] = useState(() =>
    initialScores?.fluencyScore == null
      ? ""
      : String(initialScores.fluencyScore)
  );
  const [feedback, setFeedback] = useState(initialFeedback);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const pronunciationScore = parseScore(pronunciation);
  const fluencyScore = parseScore(fluency);

  const grammarScore =
    initialScores?.grammarScore ?? null;

  const vocabularyScore =
    initialScores?.vocabularyScore ?? null;

  const aiReady =
    grammarScore != null &&
    vocabularyScore != null;

  const teacherReady =
    pronunciationScore != null &&
    fluencyScore != null;

  const canSave = aiReady && teacherReady && !saving;

  const average =
    aiReady && teacherReady
      ? (
          pronunciationScore +
          fluencyScore +
          grammarScore +
          vocabularyScore
        ) / 4
      : null;

  async function handleSave() {
    setError("");
    setMessage("");

    if (!teacherReady) {
      setError(
        "Vui lòng nhập điểm Phát âm và Độ trôi chảy từ 0 đến 10."
      );
      return;
    }

    if (!aiReady) {
      setError(
        "AI chưa chấm Ngữ pháp và Từ vựng. Vui lòng chấm AI trước."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/teacher/assignments/${encodeURIComponent(
          assignmentId
        )}/submissions/${encodeURIComponent(
          submissionId
        )}/grade`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questionId,
            pronunciationScore,
            fluencyScore,
            feedback: feedback.trim(),
          }),
        }
      );

      const text = await response.text();

      let result: {
        success?: boolean;
        message?: string;
        score?: number | null;
        questionScore?: number | null;
        gradingStatus?: string;
      } = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `API trả về dữ liệu không hợp lệ (HTTP ${response.status})`
        );
      }

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.message || "Không thể lưu điểm Speaking"
        );
      }

      setMessage(
        result.gradingStatus === "COMPLETED"
          ? "Đã lưu điểm. Bài Speaking đã hoàn thành chấm điểm."
          : "Đã lưu điểm câu này. Các câu còn lại có thể đang chờ chấm."
      );

      onSaved?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Có lỗi khi lưu điểm"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-blue-200 bg-blue-50 p-5">
      <div>
        <h3 className="text-lg font-bold text-blue-900">
          Giáo viên đánh giá Speaking
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          AI chấm Ngữ pháp và Từ vựng. Giáo viên nghe
          bản ghi âm để chấm Phát âm và Độ trôi chảy.
        </p>
      </div>

      {/* AI SCORES */}

      <div>
        <h4 className="mb-3 font-semibold text-slate-800">
          Điểm AI (chỉ xem)
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">
              Ngữ pháp
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-700">
              {grammarScore == null
                ? "--"
                : `${grammarScore.toFixed(1)}/10`}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">
              Từ vựng
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-700">
              {vocabularyScore == null
                ? "--"
                : `${vocabularyScore.toFixed(1)}/10`}
            </p>
          </div>
        </div>
      </div>

      {/* TEACHER SCORES */}

      <div>
        <h4 className="mb-3 font-semibold text-slate-800">
          Giáo viên nhập điểm
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-4">
            <label
              htmlFor={`pronunciation-${recordId}`}
              className="mb-2 block text-sm font-medium"
            >
              Phát âm (0–10)
            </label>

            <input
              id={`pronunciation-${recordId}`}
              type="text"
              inputMode="decimal"
              value={pronunciation}
              onChange={(event) =>
                setPronunciation(event.target.value)
              }
              placeholder="Ví dụ: 8.5 hoặc 8,5"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="rounded-lg bg-white p-4">
            <label
              htmlFor={`fluency-${recordId}`}
              className="mb-2 block text-sm font-medium"
            >
              Độ trôi chảy (0–10)
            </label>

            <input
              id={`fluency-${recordId}`}
              type="text"
              inputMode="decimal"
              value={fluency}
              onChange={(event) =>
                setFluency(event.target.value)
              }
              placeholder="Ví dụ: 7.5 hoặc 7,5"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* AVERAGE */}

      <div className="rounded-lg bg-white p-4">
        <p className="text-sm text-gray-500">
          Điểm trung bình câu (dự kiến)
        </p>

        <p className="mt-2 text-3xl font-bold text-blue-700">
          {average == null
            ? "--"
            : average.toFixed(2)}
          /10
        </p>

        <p className="mt-2 text-xs text-gray-500">
          (Phát âm + Độ trôi chảy + Ngữ pháp +
          Từ vựng) / 4
        </p>
      </div>

      {/* FEEDBACK */}

      <div>
        <label
          htmlFor={`teacher-feedback-${recordId}`}
          className="mb-2 block font-semibold"
        >
          Nhận xét của giáo viên
        </label>

        <textarea
          id={`teacher-feedback-${recordId}`}
          rows={4}
          maxLength={5000}
          value={feedback}
          onChange={(event) =>
            setFeedback(event.target.value)
          }
          placeholder="Nhận xét về phát âm, cách ngắt nghỉ và độ trôi chảy..."
          className="w-full rounded-lg border border-gray-300 bg-white p-3"
        />
      </div>

      {!aiReady && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Chưa có đủ điểm AI. Cần chấm Ngữ pháp và
          Từ vựng trước khi hoàn tất điểm Speaking.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={!canSave}
        className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Đang lưu..."
          : "Lưu điểm giáo viên"}
      </button>
    </div>
  );
}
