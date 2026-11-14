
"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Headphones,
  Mic,
  PenLine,
  Sparkles,
  Loader2,
  RotateCcw,
  CheckCircle2,
  Square,
} from "lucide-react";

type Skill = "READING" | "LISTENING" | "SPEAKING" | "WRITING";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

type Option = {
  label: string;
  content: string;
};

type Question = {
  id: string;
  type: string;
  content: string;
  options?: Option[];
  instructions?: string;
  preparationSeconds?: number;
  speakingSeconds?: number;
  hints?: string[];
  minWords?: number;
  maxWords?: number;
};

type Exercise = {
  id: string;
  skill: Skill;
  title: string;
  description: string;
  content?: string;
  passage?: string;
  audioUrl?: string;
  questions: Question[];
};

type SpeakingEvaluation = {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  correctedAnswer: string;
  suggestedAnswer: string;
  criteria: {
    relevance: number;
    grammar: number;
    vocabulary: number;
    coherence: number;
  };
};

type SpeakingResult = {
  id: string;
  transcript: string;
  evaluation: SpeakingEvaluation;
};

type WritingEvaluation = {
  score: number;
  wordCount: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  mistakes: Array<{
    original: string;
    correction: string;
    explanation: string;
  }>;
  correctedAnswer: string;
  suggestedAnswer: string;
  criteria: {
    content: number;
    grammar: number;
    vocabulary: number;
    organization: number;
  };
};

type WritingResult = {
  id: string;
  question: string;
  studentAnswer: string;
  evaluation: WritingEvaluation;
};

type PracticeResult = {
  score: number;
  correctCount?: number;
  totalQuestions: number;
  results: Array<{
    id: string;
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  }>;
};

const skills = [
  { id: "READING", name: "Reading", icon: BookOpen },
  { id: "LISTENING", name: "Listening", icon: Headphones },
  { id: "SPEAKING", name: "Speaking", icon: Mic },
  { id: "WRITING", name: "Writing", icon: PenLine },
] as const;

const readingTypes = [
  ["MULTIPLE_CHOICE", "Trắc nghiệm"],
  ["TRUE_FALSE", "Đúng / Sai"],
  ["FILL_BLANK", "Điền từ"],
  ["REORDER", "Sắp xếp câu"],
  ["MATCHING", "Nối đáp án"],
] as const;

type ApiResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  exercise?: Exercise;
  transcript?: string;
  score?: number;
  correctCount?: number;
  totalQuestions?: number;
  results?: unknown;
};

async function readApi(response: Response): Promise<ApiResponse> {
  const text = await response.text();
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `API trả dữ liệu không hợp lệ (HTTP ${response.status}).`
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("API response must be an object.");
  }
  const payload = data as ApiResponse;

  if (!response.ok || payload.success !== true) {
    throw new Error(
      payload.error || payload.message || "Request failed."
    );
  }

  return payload;
}

export default function PracticePage() {
  const [skill, setSkill] = useState<Skill>("READING");
  const [grade, setGrade] = useState(6);
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [topic, setTopic] = useState("Family");
  const [questionCount, setQuestionCount] = useState(5);

  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    readingTypes.map(([id]) => id)
  );

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [speakingResults, setSpeakingResults] =
    useState<SpeakingResult[]>([]);
  const [writingResults, setWritingResults] = useState<WritingResult[]>([]);

  const [audioUrls, setAudioUrls] =
    useState<Record<string, string>>({});
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlsRef = useRef<Record<string, string>>({});

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      stopTracks();
      Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  function clearAudio() {
    Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
    urlsRef.current = {};
    setAudioUrls({});
  }

  function resetPractice() {
    clearAudio();
    setExercise(null);
    setAnswers({});
    setResult(null);
    setSpeakingResults([]);
    setWritingResults([]);
    setError("");
  }

  function setAnswer(id: string, value: string) {
    if (result) return;
    setAnswers((previous) => ({ ...previous, [id]: value }));
  }

  async function generateExercise() {
    if (loading) return;

    setLoading(true);
    setError("");
    resetPractice();

    try {
      const endpoint =
        skill === "READING"
          ? "/api/student/practice/generate"
          : skill === "LISTENING"
          ? "/api/student/practice/generate-listening"
          : skill === "SPEAKING"
          ? "/api/student/practice/generate-speaking"
          : "/api/student/practice/generate-writing";

      const body = {
        grade,
        topic: topic.trim(),
        difficulty,
        questionCount,
        ...(skill === "READING"
          ? { skill, questionTypes: selectedTypes }
          : {}),
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await readApi(response);

      if (
        !data.exercise?.id ||
        !Array.isArray(data.exercise.questions) ||
        !data.exercise.questions.length
      ) {
        throw new Error("Dữ liệu bài tập không hợp lệ.");
      }

      setExercise({ ...data.exercise, skill });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo bài.");
    } finally {
      setLoading(false);
    }
  }

  async function startRecording(id: string) {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ microphone.");
      }

      if (typeof MediaRecorder === "undefined") {
        throw new Error("Trình duyệt không hỗ trợ ghi âm.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];

      const mimeType = mimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (urlsRef.current[id]) {
          URL.revokeObjectURL(urlsRef.current[id]);
        }

        const url = URL.createObjectURL(blob);
        urlsRef.current[id] = url;
        setAudioUrls((previous) => ({ ...previous, [id]: url }));
        setAnswers((previous) => {
          const next = { ...previous };
          delete next[id];
          return next;
        });

        stopTracks();
        setRecordingId(null);
      };

      recorder.onerror = () => {
        stopTracks();
        setRecordingId(null);
        setError("Không thể hoàn thành bản ghi âm.");
      };

      recorder.start();
      setRecordingId(id);
    } catch (err) {
      stopTracks();
      setError(
        err instanceof Error ? err.message : "Không thể ghi âm."
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  async function transcribeRecording(id: string) {
    if (!exercise || !audioUrls[id] || processingId) return;

    setProcessingId(id);
    setError("");

    try {
      const response = await fetch(audioUrls[id]);
      const blob = await response.blob();

      const extension = blob.type.includes("mp4")
        ? "mp4"
        : "webm";

      const formData = new FormData();
      formData.append("sessionId", exercise.id);
      formData.append("questionId", id);
      formData.append(
        "audio",
        new File([blob], `answer-${id}.${extension}`, {
          type: blob.type,
        })
      );

      const apiResponse = await fetch(
        "/api/student/practice/speaking/transcribe",
        { method: "POST", body: formData }
      );

      const data = await readApi(apiResponse);
      if (typeof data.transcript !== "string") {
        throw new Error("Transcription response is invalid.");
      }
      const transcript = data.transcript;
      setAnswers((previous) => ({
        ...previous,
        [id]: transcript,
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể nhận diện giọng nói."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function submitExercise() {
    if (!exercise || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const speaking = exercise.skill === "SPEAKING";
      const writing = exercise.skill === "WRITING";

      const endpoint = speaking
        ? "/api/student/practice/speaking/submit"
        : writing
        ? "/api/student/practice/writing/submit"
        : "/api/student/practice/submit";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          speaking
            ? { sessionId: exercise.id, transcripts: answers }
            : { sessionId: exercise.id, answers }
        ),
      });

      const data = await readApi(response);
      if (
        typeof data.score !== "number" ||
        typeof data.totalQuestions !== "number" ||
        !Array.isArray(data.results)
      ) {
        throw new Error("Practice result is invalid.");
      }

      if (speaking) {
        setSpeakingResults(data.results as SpeakingResult[]);
        setResult({
          score: data.score,
          totalQuestions: data.totalQuestions,
          results: [],
        });
      } else if (writing) {
        if (!Array.isArray(data.results)) {
          throw new Error("Kết quả chấm Writing không hợp lệ.");
        }
        setWritingResults(data.results as WritingResult[]);
        setResult({
          score: data.score,
          totalQuestions: data.totalQuestions,
          results: [],
        });
      } else {
        setResult({
          score: data.score,
          correctCount: data.correctCount,
          totalQuestions: data.totalQuestions,
          results: data.results as PracticeResult["results"],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi nộp bài.");
    } finally {
      setSubmitting(false);
    }
  }

  function countWords(value: string): number {
    const text = value.trim();
    return text ? text.split(/\s+/).length : 0;
  }

  function renderWritingAnswer(question: Question) {
    const answer = answers[question.id] || "";
    const words = countWords(answer);
    const minWords = question.minWords ?? 1;
    const maxWords = question.maxWords ?? 200;
    const isOutOfRange = words > 0 && (words < minWords || words > maxWords);
    const feedback = writingResults.find((item) => item.id === question.id);

    return (
      <div className="mt-5 space-y-4">
        {question.instructions && (
          <p className="text-slate-600">{question.instructions}</p>
        )}

        {question.hints && question.hints.length > 0 && (
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="mb-2 font-semibold text-blue-700">Từ vựng gợi ý</p>
            <div className="flex flex-wrap gap-2">
              {question.hints.map((hint, index) => (
                <span key={index} className="rounded-lg bg-white px-3 py-2 text-sm text-blue-700">
                  {hint}
                </span>
              ))}
            </div>
          </div>
        )}

        <label htmlFor={`writing-${question.id}`} className="block font-medium">
          Bài viết của em
        </label>
        <textarea
          id={`writing-${question.id}`}
          rows={question.type === "WORD_WRITING" ? 3 : 7}
          maxLength={10000}
          disabled={Boolean(result)}
          value={answer}
          onChange={(event) => setAnswer(question.id, event.target.value)}
          placeholder="Write your answer in English..."
          className="w-full resize-y rounded-xl border border-slate-300 p-4 leading-7 outline-none focus:border-blue-500 disabled:bg-slate-50"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className={isOutOfRange ? "font-medium text-amber-700" : "text-slate-500"}>
            Đã viết {words} từ · Yêu cầu {minWords}–{maxWords} từ
          </span>
          {isOutOfRange && !result && (
            <span className="text-amber-700">Vui lòng điều chỉnh số từ.</span>
          )}
        </div>

        {feedback && (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <h4 className="text-lg font-bold text-emerald-800">
              Điểm câu này: {feedback.evaluation.score.toFixed(2)}/10
            </h4>
            <p className="whitespace-pre-wrap">{feedback.evaluation.feedback}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ["Nội dung", feedback.evaluation.criteria.content],
                ["Ngữ pháp", feedback.evaluation.criteria.grammar],
                ["Từ vựng", feedback.evaluation.criteria.vocabulary],
                ["Tổ chức bài", feedback.evaluation.criteria.organization],
              ] as const).map(([label, score]) => (
                <div key={label} className="rounded-lg bg-white p-3 text-sm">
                  <span className="font-medium">{label}: </span>{score}/10
                </div>
              ))}
            </div>
            {feedback.evaluation.strengths.length > 0 && (
              <div>
                <h5 className="font-semibold">Điểm mạnh</h5>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {feedback.evaluation.strengths.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {feedback.evaluation.improvements.length > 0 && (
              <div>
                <h5 className="font-semibold">Cần cải thiện</h5>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {feedback.evaluation.improvements.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {feedback.evaluation.mistakes.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-semibold">Lỗi và cách sửa</h5>
                {feedback.evaluation.mistakes.map((mistake, index) => (
                  <div key={index} className="rounded-lg bg-white p-3 text-sm">
                    <p className="text-red-700"><strong>Đã viết:</strong> {mistake.original}</p>
                    <p className="mt-1 text-emerald-700"><strong>Sửa thành:</strong> {mistake.correction}</p>
                    <p className="mt-1 text-slate-600">{mistake.explanation}</p>
                  </div>
                ))}
              </div>
            )}
            <div>
              <h5 className="font-semibold">Bài viết được sửa</h5>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3">
                {feedback.evaluation.correctedAnswer}
              </p>
            </div>
            <div>
              <h5 className="font-semibold">Bài viết mẫu</h5>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3">
                {feedback.evaluation.suggestedAnswer}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderAnswer(question: Question) {
    const selected = answers[question.id] || "";
    const disabled = Boolean(result);

    if (question.type === "MULTIPLE_CHOICE") {
      return (
        <div className="mt-4 grid gap-3">
          {(question.options || []).map((option) => (
            <button
              key={option.label}
              type="button"
              disabled={disabled}
              onClick={() => setAnswer(question.id, option.label)}
              className={`rounded-xl border p-3 text-left ${
                selected === option.label
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200"
              }`}
            >
              <strong>{option.label}.</strong> {option.content}
            </button>
          ))}
        </div>
      );
    }

    if (question.type === "TRUE_FALSE") {
      return (
        <div className="mt-4 flex gap-3">
          {["TRUE", "FALSE"].map((value) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => setAnswer(question.id, value)}
              className={`rounded-xl border px-6 py-3 ${
                selected === value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200"
              }`}
            >
              {value === "TRUE" ? "Đúng" : "Sai"}
            </button>
          ))}
        </div>
      );
    }

    if (question.type === "MATCHING") {
      const items = question.content
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);

      const pairs: Record<string, string> = {};

      selected.split(",").forEach((pair) => {
        const [key, value] = pair.split("-");
        if (key && value) pairs[key.trim()] = value.trim();
      });

      return (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => {
            const key = String(index + 1);

            return (
              <div
                key={key}
                className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2"
              >
                <span>{key}. {item}</span>

                <select
                  disabled={disabled}
                  value={pairs[key] || ""}
                  onChange={(event) => {
                    const next = {
                      ...pairs,
                      [key]: event.target.value,
                    };

                    const value = items
                      .map((_, i) => {
                        const position = String(i + 1);
                        return next[position]
                          ? `${position}-${next[position]}`
                          : "";
                      })
                      .filter(Boolean)
                      .join(",");

                    setAnswer(question.id, value);
                  }}
                  className="rounded-lg border p-2"
                >
                  <option value="">Chọn đáp án</option>
                  {(question.options || []).map((option) => (
                    <option
                      key={option.label}
                      value={option.label}
                      disabled={Object.entries(pairs).some(
                        ([position, value]) =>
                          position !== key && value === option.label
                      )}
                    >
                      {option.label}. {option.content}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3">
        {question.type === "REORDER" && (
          <div className="flex flex-wrap gap-2">
            {question.content.split("|").map((word, index) => (
              <span
                key={index}
                className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700"
              >
                {word.trim()}
              </span>
            ))}
          </div>
        )}

        <input
          value={selected}
          disabled={disabled}
          onChange={(event) =>
            setAnswer(question.id, event.target.value)
          }
          placeholder="Nhập câu trả lời..."
          className="w-full rounded-xl border p-3"
        />
      </div>
    );
  }

  const answeredCount = exercise
    ? exercise.questions.filter((question) => {
        const answer = answers[question.id]?.trim();
        if (!answer) return false;

        if (exercise.skill === "WRITING") {
          const words = countWords(answer);
          return words >= (question.minWords ?? 1) &&
            words <= (question.maxWords ?? 200);
        }

        if (question.type === "MATCHING") {
          const count = question.content
            .split("|")
            .filter((item) => item.trim()).length;

          return answer.split(",").length === count;
        }

        return true;
      }).length
    : 0;

  const canSubmit =
    exercise &&
    answeredCount === exercise.questions.length &&
    !result &&
    !submitting &&
    !recordingId &&
    !processingId;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 p-7 text-white">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles size={18} />
            AI PERSONALIZED PRACTICE
          </div>
          <h1 className="mt-3 text-3xl font-bold">
            Luyện tập tiếng Anh cùng AI
          </h1>
          <p className="mt-2 text-blue-100">
            Reading · Listening · Speaking · Writing
          </p>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!exercise ? (
          <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Tạo bài luyện tập</h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {skills.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSkill(item.id)}
                    className={`rounded-xl border p-4 ${
                      skill === item.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200"
                    }`}
                  >
                    <Icon className="mx-auto mb-2" size={26} />
                    <span className="font-semibold">{item.name}</span>
                  </button>
                );
              })}
            </div>

            {skill === "WRITING" && (
              <p className="rounded-xl bg-blue-50 p-4 text-blue-800">
                Viết câu hoặc đoạn văn bằng tiếng Anh. AI sẽ đánh giá nội dung,
                ngữ pháp, từ vựng và cách tổ chức bài viết.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-medium">Khối lớp</label>
                <select
                  value={grade}
                  onChange={(event) => setGrade(Number(event.target.value))}
                  className="w-full rounded-xl border p-3"
                >
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(
                    (value) => (
                      <option key={value} value={value}>
                        Lớp {value}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">Độ khó</label>
                <select
                  value={difficulty}
                  onChange={(event) =>
                    setDifficulty(event.target.value as Difficulty)
                  }
                  className="w-full rounded-xl border p-3"
                >
                  <option value="EASY">Dễ</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HARD">Khó</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">Chủ đề</label>
                <input
                  value={topic}
                  maxLength={100}
                  onChange={(event) => setTopic(event.target.value)}
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Số câu hỏi</label>
                <select
                  value={questionCount}
                  onChange={(event) =>
                    setQuestionCount(Number(event.target.value))
                  }
                  className="w-full rounded-xl border p-3"
                >
                  <option value={5}>5 câu</option>
                  <option value={10}>10 câu</option>
                </select>
              </div>
            </div>

            {skill === "READING" && (
              <div>
                <p className="mb-3 font-medium">Dạng câu hỏi</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {readingTypes.map(([id, label]) => (
                    <label key={id} className="flex items-center gap-3 rounded-xl border p-3">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(id)}
                        onChange={() =>
                          setSelectedTypes((previous) =>
                            previous.includes(id)
                              ? previous.filter((type) => type !== id)
                              : [...previous, id]
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={
                loading ||
                !topic.trim() ||
                (skill === "READING" && !selectedTypes.length)
              }
              onClick={generateExercise}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-4 font-semibold text-white disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {loading ? "AI đang tạo bài..." : "Tạo bài bằng AI"}
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold">{exercise.title}</h2>
              <p className="mt-2 text-slate-600">
                {exercise.description}
              </p>
              <p className="mt-3 text-sm text-blue-600">
                {exercise.skill} · {exercise.questions.length} câu
              </p>
            </section>

            {exercise.skill === "READING" &&
              (exercise.content || exercise.passage) && (
                <section className="rounded-2xl bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-lg font-bold">Reading Passage</h3>
                  <p className="whitespace-pre-wrap leading-8">
                    {exercise.content || exercise.passage}
                  </p>
                </section>
              )}

            {exercise.skill === "LISTENING" && exercise.audioUrl && (
              <section className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-lg font-bold">Listening Audio</h3>
                <audio
                  controls
                  preload="none"
                  src={exercise.audioUrl}
                  className="w-full"
                />
              </section>
            )}

            {exercise.questions.map((question, index) => {
              const feedback = result?.results.find(
                (item) => item.id === question.id
              );

              const speakingFeedback = speakingResults.find(
                (item) => item.id === question.id
              );

              return (
                <section
                  key={question.id}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <p className="mb-2 font-semibold text-blue-600">
                    Câu {index + 1}
                  </p>

                  {question.type !== "REORDER" &&
                    question.type !== "MATCHING" && (
                      <h3 className="whitespace-pre-wrap text-lg font-semibold">
                        {question.content}
                      </h3>
                    )}

                  {exercise.skill === "SPEAKING" ? (
                    <div className="mt-5 space-y-4">
                      <p className="text-sm text-slate-500">
                        {question.instructions}
                      </p>

                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="rounded-lg bg-blue-50 px-3 py-2">
                          Chuẩn bị: {question.preparationSeconds ?? 0}s
                        </span>
                        <span className="rounded-lg bg-blue-50 px-3 py-2">
                          Thời gian nói gợi ý: {question.speakingSeconds ?? 30}s
                        </span>
                      </div>

                      {!result && (
                        <>
                          {recordingId === question.id ? (
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white"
                            >
                              <Square size={18} />
                              Dừng ghi âm
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={Boolean(recordingId || processingId)}
                              onClick={() => startRecording(question.id)}
                              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
                            >
                              <Mic size={18} />
                              {audioUrls[question.id]
                                ? "Ghi âm lại"
                                : "Bắt đầu ghi âm"}
                            </button>
                          )}

                          {audioUrls[question.id] && (
                            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                              <p className="font-medium">Nghe lại bản ghi âm</p>

                              <audio
                                controls
                                src={audioUrls[question.id]}
                                className="w-full"
                              />

                              <button
                                type="button"
                                disabled={Boolean(processingId || recordingId)}
                                onClick={() => transcribeRecording(question.id)}
                                className="rounded-xl bg-indigo-600 px-4 py-3 text-white disabled:opacity-50"
                              >
                                {processingId === question.id
                                  ? "Đang nhận diện..."
                                  : "Chuyển giọng nói thành văn bản"}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {answers[question.id] && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <p className="font-semibold text-blue-700">
                            Nội dung AI nhận diện
                          </p>
                          <p className="mt-2">{answers[question.id]}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            Nếu nhận diện sai, hãy ghi âm lại.
                          </p>
                        </div>
                      )}

                      {speakingFeedback && (
                        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                          <h4 className="font-bold text-emerald-800">
                            Điểm: {speakingFeedback.evaluation.score}/10
                          </h4>

                          <p>{speakingFeedback.evaluation.feedback}</p>

                          <div className="grid gap-2 text-sm sm:grid-cols-2">
                            <p>
                              Nội dung:{" "}
                              {speakingFeedback.evaluation.criteria.relevance}/10
                            </p>
                            <p>
                              Ngữ pháp:{" "}
                              {speakingFeedback.evaluation.criteria.grammar}/10
                            </p>
                            <p>
                              Từ vựng:{" "}
                              {speakingFeedback.evaluation.criteria.vocabulary}/10
                            </p>
                            <p>
                              Diễn đạt:{" "}
                              {speakingFeedback.evaluation.criteria.coherence}/10
                            </p>
                          </div>

                          <p>
                            <strong>Câu sửa:</strong>{" "}
                            {speakingFeedback.evaluation.correctedAnswer}
                          </p>

                          <p>
                            <strong>Câu gợi ý:</strong>{" "}
                            {speakingFeedback.evaluation.suggestedAnswer}
                          </p>

                          {speakingFeedback.evaluation.improvements.length > 0 && (
                            <div>
                              <strong>Cần cải thiện:</strong>
                              <ul className="mt-2 list-disc pl-5">
                                {speakingFeedback.evaluation.improvements.map(
                                  (item, i) => <li key={i}>{item}</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : exercise.skill === "WRITING" ? (
                    renderWritingAnswer(question)
                  ) : (
                    <>
                      {renderAnswer(question)}

                      {feedback && (
                        <div
                          className={`mt-5 rounded-xl p-4 ${
                            feedback.isCorrect
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-red-50 text-red-800"
                          }`}
                        >
                          <p className="font-semibold">
                            {feedback.isCorrect
                              ? "Chính xác"
                              : "Chưa chính xác"}
                          </p>
                          <p className="mt-2">
                            Đáp án: {feedback.correctAnswer}
                          </p>
                          <p className="mt-2">{feedback.explanation}</p>
                        </div>
                      )}
                    </>
                  )}
                </section>
              );
            })}

            {!result ? (
              <section className="space-y-3">
                <p className="text-center text-sm text-slate-500">
                  Đã hoàn thành {answeredCount}/{exercise.questions.length} câu
                </p>

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={submitExercise}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-4 font-bold text-white disabled:opacity-50"
                >
                  {submitting && <Loader2 className="animate-spin" />}
                  {submitting ? "Đang chấm điểm..." : "Nộp bài"}
                </button>
              </section>
            ) : (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7 text-center">
                <CheckCircle2
                  size={42}
                  className="mx-auto text-emerald-600"
                />

                <h2 className="mt-3 text-xl font-bold">
                  Hoàn thành bài luyện tập!
                </h2>

                <p className="mt-3 text-4xl font-bold text-emerald-700">
                  {result.score.toFixed(2)}/10
                </p>

                {result.correctCount !== undefined && (
                  <p className="mt-2">
                    Đúng {result.correctCount}/{result.totalQuestions} câu
                  </p>
                )}

                <button
                  type="button"
                  onClick={resetPractice}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white"
                >
                  <RotateCcw size={18} />
                  Luyện tập bài mới
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
