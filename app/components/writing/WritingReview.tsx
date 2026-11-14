"use client";

type RubricKey = "content" | "grammar" | "vocabulary" | "coherence";
type Grade = {
  rubric: Record<RubricKey, number>;
  feedback: string;
  corrections: string[];
  strengths: string[];
};
const criteria: { key: RubricKey; name: string; max: number }[] = [
  { key: "content", name: "Nội dung", max: 3 },
  { key: "grammar", name: "Ngữ pháp", max: 3 },
  { key: "vocabulary", name: "Từ vựng", max: 2 },
  { key: "coherence", name: "Mạch lạc", max: 2 },
];
function parseFeedback(raw: string | null | undefined): Grade | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const v = value as Record<string, unknown>;
    if (!v.rubric || typeof v.rubric !== "object" || typeof v.feedback !== "string") return null;
    const rubric = v.rubric as Record<string, unknown>;
    if (!criteria.every(({ key, max }) => typeof rubric[key] === "number" &&
      Number.isFinite(rubric[key]) && (rubric[key] as number) >= 0 && (rubric[key] as number) <= max)) return null;
    return {
      rubric: rubric as Record<RubricKey, number>,
      feedback: v.feedback,
      corrections: Array.isArray(v.corrections) ? v.corrections.filter((x): x is string => typeof x === "string") : [],
      strengths: Array.isArray(v.strengths) ? v.strengths.filter((x): x is string => typeof x === "string") : [],
    };
  } catch { return null; }
}
export default function WritingReview({ prompt, answer, score, feedback }: {
  prompt: string;
  answer: string | null | undefined;
  score: number | null | undefined;
  feedback: string | null | undefined;
}) {
  const result = parseFeedback(feedback);
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Đề Writing</h3>
        <p className="mt-2 whitespace-pre-wrap text-slate-700">{prompt}</p>
      </div>
      <div>
        <h4 className="font-semibold text-slate-800">Bài viết đã nộp</h4>
        <div className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 leading-7 text-slate-800">{answer || "Không có bài viết được lưu"}</div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold text-slate-800">Đánh giá theo rubric</h4>
        <span className="font-bold text-blue-700">{score == null ? "Chưa có điểm" : `${Number(score).toFixed(2)}/10`}</span>
      </div>
      {result ? <>
        <div className="grid gap-3 sm:grid-cols-2">
          {criteria.map(({key,name,max}) => <div key={key} className="rounded-xl border p-4">
            <div className="flex justify-between gap-2 text-sm"><span>{name}</span><strong>{result.rubric[key]}/{max}</strong></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{width:`${100*result.rubric[key]/max}%`}} />
            </div>
          </div>)}
        </div>
        <div><h4 className="font-semibold">Nhận xét của AI</h4><p className="mt-2 whitespace-pre-wrap text-slate-700">{result.feedback}</p></div>
        {result.strengths.length > 0 && <div><h4 className="font-semibold text-green-700">Điểm mạnh</h4><ul className="mt-2 list-disc space-y-1 pl-5">{result.strengths.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
        {result.corrections.length > 0 && <div><h4 className="font-semibold text-amber-700">Gợi ý cải thiện</h4><ul className="mt-2 list-disc space-y-1 pl-5">{result.corrections.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
      </> : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Chưa có nhận xét rubric hợp lệ. Vui lòng liên hệ giáo viên nếu kết quả chưa chính xác.</p>}
      <p className="text-xs text-slate-500">Điểm AI là đánh giá tự động, có thể cần giáo viên kiểm tra lại.</p>
    </section>
  );
}
