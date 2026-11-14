
"use client";

type SpeakingData = {
  recordId: string;
  transcript: string | null;
  audioUrl: string;

  pronunciationScore: number | null;
  fluencyScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;

  feedback: string | null;
};

type Props = {
  question: string;
  speaking: SpeakingData | null;
  score?: number | null;
};

type ParsedFeedback = {
  feedback: string;
  strengths: string[];
  corrections: string[];
};

// ======================================================
// PARSE AI FEEDBACK
// ======================================================

function parseSpeakingFeedback(
  value: string | null
): ParsedFeedback {
  const empty: ParsedFeedback = {
    feedback: "",
    strengths: [],
    corrections: [],
  };

  if (!value || !value.trim()) {
    return empty;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    // Hỗ trợ JSON string chứa văn bản thông thường
    if (typeof parsed === "string") {
      return {
        ...empty,
        feedback: parsed,
      };
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {
        ...empty,
        feedback: value,
      };
    }

    const data = parsed as Record<string, unknown>;

    return {
      feedback:
        typeof data.feedback === "string"
          ? data.feedback
          : "",

      strengths: Array.isArray(data.strengths)
        ? data.strengths.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],

      corrections: Array.isArray(data.corrections)
        ? data.corrections.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],
    };
  } catch {
    // Tương thích nhận xét cũ dạng văn bản
    return {
      ...empty,
      feedback: value,
    };
  }
}

// ======================================================
// SPEAKING REVIEW COMPONENT
// ======================================================

export default function SpeakingReview({
  question,
  speaking,
  score,
}: Props) {
  if (!speaking) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="font-semibold text-amber-900">
          {question}
        </h3>

        <p className="mt-3 text-sm text-amber-700">
          Không tìm thấy bản ghi Speaking.
        </p>
      </section>
    );
  }

  const feedback = parseSpeakingFeedback(
    speaking.feedback
  );

  const metrics = [
    {
      label: "Phát âm",
      value: speaking.pronunciationScore,
      evaluator: "Giáo viên",
    },
    {
      label: "Độ trôi chảy",
      value: speaking.fluencyScore,
      evaluator: "Giáo viên",
    },
    {
      label: "Ngữ pháp",
      value: speaking.grammarScore,
      evaluator: "AI",
    },
    {
      label: "Từ vựng",
      value: speaking.vocabularyScore,
      evaluator: "AI",
    },
  ];

  const hasEvaluation =
    score != null ||
    metrics.some((metric) => metric.value != null);

  const hasFeedback =
    Boolean(feedback.feedback) ||
    feedback.strengths.length > 0 ||
    feedback.corrections.length > 0;

  const waitingTeacher =
    speaking.pronunciationScore == null ||
    speaking.fluencyScore == null;

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* QUESTION */}

      <div>
        <p className="text-sm font-medium text-blue-600">
          Speaking Review
        </p>

        <h3 className="mt-2 text-lg font-bold text-slate-900">
          {question}
        </h3>
      </div>

      {/* AUDIO */}

      <div>
        <h4 className="mb-3 font-semibold text-slate-800">
          Bản ghi âm của bạn
        </h4>

        <audio
          controls
          preload="metadata"
          src={speaking.audioUrl}
          className="w-full"
        >
          Trình duyệt không hỗ trợ phát audio.
        </audio>
      </div>

      {/* TRANSCRIPT */}

      <div className="rounded-xl bg-indigo-50 p-4">
        <h4 className="font-semibold text-indigo-900">
          Nội dung đã nói (Transcript)
        </h4>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {speaking.transcript || "Chưa có transcript."}
        </p>
      </div>

      {/* SCORES */}

      <div>
        <h4 className="mb-3 font-semibold text-slate-800">
          Kết quả đánh giá
        </h4>

        {!hasEvaluation && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Bài Speaking đã được nộp và đang chờ đánh giá.
          </p>
        )}

        {waitingTeacher && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Đang chờ giáo viên chấm Phát âm và Độ trôi chảy.
            Điểm tổng sẽ được hiển thị sau khi hoàn tất.
          </p>
        )}

        {score != null && !waitingTeacher && (
          <p className="mb-4 text-lg font-bold text-blue-700">
            Điểm Speaking: {Number(score).toFixed(2)}/10
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-600">
                  {metric.label}
                </p>

                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    metric.evaluator === "AI"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-purple-50 text-purple-700"
                  }`}
                >
                  {metric.evaluator}
                </span>
              </div>

              <p className="mt-3 text-xl font-bold text-slate-900">
                {metric.value != null
                  ? `${Number(metric.value).toFixed(1)}/10`
                  : "--"}
              </p>

              {metric.value == null && (
                <p className="mt-1 text-xs text-slate-400">
                  Chưa được chấm
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FEEDBACK */}

      {hasFeedback && (
        <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-5">
          <h4 className="text-lg font-bold text-green-900">
            Nhận xét của AI
          </h4>

          {feedback.feedback && (
            <div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-green-900">
                {feedback.feedback}
              </p>
            </div>
          )}

          {feedback.strengths.length > 0 && (
            <div className="rounded-lg bg-white p-4">
              <h5 className="mb-2 font-semibold text-green-700">
                ✓ Điểm mạnh
              </h5>

              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                {feedback.strengths.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {feedback.corrections.length > 0 && (
            <div className="rounded-lg bg-white p-4">
              <h5 className="mb-2 font-semibold text-amber-700">
                Gợi ý cải thiện
              </h5>

              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                {feedback.corrections.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
