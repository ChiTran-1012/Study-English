
"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import ListeningExam from "@/app/components/listening/ListeningExam";
import WritingExam from "@/app/components/writing/WritingExam";
import WritingReview from "@/app/components/writing/WritingReview";
import SpeakingExam from "@/app/components/speaking/SpeakingExam";
import SpeakingReview from "@/app/components/speaking/SpeakingReview";

// ======================================================
// TYPES
// ======================================================

type Option = {
  id: string;
  label: string;
  content: string;
  isCorrect?: boolean;
};

type Question = {
  id: string;
  content: string;
  type: string;
  order: number;
  explanation?: string | null;
  correctAnswer?: string | null;
  options: Option[];
};

type AssignmentData = {
  id: string;
  title?: string | null;
  description?: string | null;
  startAt: string;
  dueAt?: string | null;

  exercise: {
    id: string;
    title: string;
    description?: string | null;
    skill: string;
    difficulty: string;
    content?: string | null;
    audioUrl?: string | null;
    questions?: Question[];
  };

  class: {
    id: string;
    name: string;
    code: string;
    grade: number;
  };

  teacher: {
    id: string;
    name: string;
  };

  questions?: Question[];
};

type SpeakingReviewData = {
  recordId: string;
  transcript: string | null;
  audioUrl: string;
  pronunciationScore: number | null;
  fluencyScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;
  feedback: string | null;
};

type ReviewQuestion = Omit<Question, "options"> & {
  studentAnswer?: string | null;
  isCorrect?: boolean | null;
  earnedScore?: number | null;
  feedback?: string | null;
  speaking?: SpeakingReviewData | null;
  options: (Option & { isCorrect: boolean })[];
};

type ReviewData = {
  assignment: {
    id: string;
    title?: string | null;
    description?: string | null;
  };

  exercise: {
    id: string;
    title: string;
    description?: string | null;
    skill: string;
    difficulty: string;
    content?: string | null;
    audioUrl?: string | null;
  };

  class: {
    id: string;
    name: string;
    code: string;
    grade: number;
  };

  teacher: {
    id: string;
    name: string;
  };

  submission: {
    id: string;
    score: number | null;
    submittedAt: string | null;
  };

  questions: ReviewQuestion[];
};

const skillLabels: Record<string, string> = {
  LISTENING: "Listening",
  SPEAKING: "Speaking",
  READING: "Reading",
  WRITING: "Writing",
};

function formatDate(date?: string | null) {
  if (!date) return "Không có";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Không xác định";
  }

  return parsed.toLocaleString("vi-VN");
}

async function readApiResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `API trả về dữ liệu không hợp lệ (HTTP ${response.status}).`
    );
  }
}

// ======================================================
// MAIN PAGE
// ======================================================

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const assignmentId = params.id as string;
  const review = searchParams.get("review") === "true";

  const [assignment, setAssignment] =
    useState<AssignmentData | null>(null);

  const [reviewData, setReviewData] =
    useState<ReviewData | null>(null);

  const [answers, setAnswers] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // ====================================================
  // LOAD ASSIGNMENT
  // ====================================================

  const loadAssignment = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/student/assignments/${encodeURIComponent(
          assignmentId
        )}`,
        { credentials: "same-origin" }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Không thể tải bài tập."
        );
      }

      const raw = data.assignment ?? data;

      if (!raw?.exercise) {
        throw new Error(
          "API không trả về thông tin bài tập."
        );
      }

      const normalizedQuestions = Array.isArray(raw.questions)
        ? raw.questions
        : Array.isArray(raw.exercise.questions)
          ? raw.exercise.questions
          : [];

      setAssignment({
        ...raw,
        questions: normalizedQuestions,
      });
    } catch (err) {
      console.error("LOAD ASSIGNMENT:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải bài tập."
      );
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  // ====================================================
  // LOAD REVIEW
  // ====================================================

  const loadReview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/student/assignments/${encodeURIComponent(
          assignmentId
        )}/review`,
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Không thể xem lại bài."
        );
      }

      if (!data?.submission || !Array.isArray(data.questions)) {
        throw new Error("Dữ liệu Review không hợp lệ.");
      }

      setReviewData(data as ReviewData);
    } catch (err) {
      console.error("LOAD REVIEW:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải kết quả."
      );
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (!assignmentId) return;

    queueMicrotask(() => {
      if (review) void loadReview();
      else void loadAssignment();
    });
  }, [assignmentId, review, loadAssignment, loadReview]);

  // ====================================================
  // ANSWERS
  // ====================================================

  function handleAnswer(
    questionId: string,
    answer: string
  ) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: answer,
    }));
  }

  // ====================================================
  // SUBMIT READING / LISTENING / WRITING
  // ====================================================

  async function handleSubmit() {
    if (!assignment || submitting || submitted) return;

    const questions = assignment.questions ?? [];

    if (!questions.length) {
      alert("Bài tập chưa có câu hỏi.");
      return;
    }

    const unanswered = questions.filter(
      (question) => !answers[question.id]?.trim()
    );

    if (unanswered.length > 0) {
      alert(
        `Bạn còn ${unanswered.length} câu chưa trả lời.`
      );
      return;
    }

    if (
      !window.confirm(
        "Bạn có chắc chắn muốn nộp bài không?"
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/student/assignments/${encodeURIComponent(
          assignmentId
        )}/submit`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ answers }),
        }
      );

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "Không thể nộp bài."
        );
      }

      setSubmitted(true);

      alert(
        `Nộp bài thành công! Điểm: ${result.score ?? "--"}`
      );

      router.replace(
        `/student/assignments/${encodeURIComponent(assignmentId)}?review=true`
      );
    } catch (err) {
      console.error("SUBMIT ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể nộp bài."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ====================================================
  // LOADING / ERROR
  // ====================================================

  if (loading) {
    return (
      <PageContainer>
        <div className="py-20 text-center text-slate-500">
          Đang tải dữ liệu bài tập...
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Có lỗi xảy ra</p>
          <p className="mt-2">{error}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                review
                  ? void loadReview()
                  : void loadAssignment()
              }
              className="rounded-lg bg-red-600 px-4 py-2 text-white"
            >
              Thử lại
            </button>

            <Link
              href="/student/assignments"
              className="rounded-lg border border-red-200 bg-white px-4 py-2"
            >
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ====================================================
  // REVIEW MODE
  // ====================================================

  if (review && reviewData) {
    return (
      <ReviewPage data={reviewData} />
    );
  }

  if (!assignment) return null;

  const questions = assignment.questions ?? [];

  // ====================================================
  // SPEAKING EXAM
  // ====================================================

  if (assignment.exercise.skill === "SPEAKING") {
    if (!questions.length) {
      return (
        <PageContainer>
          <div className="rounded-xl bg-amber-50 p-5 text-amber-800">
            Bài Speaking chưa có câu hỏi.
          </div>

          <Link
            href="/student/assignments"
            className="mt-4 inline-block text-blue-600"
          >
            ← Quay lại danh sách
          </Link>
        </PageContainer>
      );
    }

    return (
      <SpeakingExam
        key={assignmentId}
        title={
          assignment.title ||
          assignment.exercise.title
        }
        questions={questions}
        assignmentId={assignmentId}
        maxSeconds={120}
      />
    );
  }

  // ====================================================
  // WRITING EXAM
  // ====================================================

  if (assignment.exercise.skill === "WRITING") {
    return (
      <WritingExam
        title={
          assignment.title ||
          assignment.exercise.title
        }
        description={
          assignment.description ||
          assignment.exercise.description
        }
        questions={questions}
        answers={answers}
        onAnswer={handleAnswer}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitted={submitted}
      />
    );
  }

  // ====================================================
  // LISTENING EXAM
  // ====================================================

  if (assignment.exercise.skill === "LISTENING") {
    return (
      <ListeningExam
        key={`${assignmentId}:${assignment.exercise.audioUrl ?? ""}`}
        title={
          assignment.title ||
          assignment.exercise.title
        }
        audioUrl={assignment.exercise.audioUrl}
        questions={questions}
        answers={answers}
        onAnswer={handleAnswer}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitted={submitted}
      />
    );
  }

  // ====================================================
  // READING / OTHER SUPPORTED QUESTION TYPES
  // ====================================================

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          href="/student/assignments"
          className="text-sm font-medium text-blue-600"
        >
          ← Quay lại bài tập
        </Link>
      </div>

      <section className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-7 text-white">
        <p className="text-sm text-blue-100">
          {skillLabels[assignment.exercise.skill] ||
            assignment.exercise.skill}
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          {assignment.title ||
            assignment.exercise.title}
        </h1>

        {assignment.description && (
          <p className="mt-3 text-blue-100">
            {assignment.description}
          </p>
        )}

        <div className="mt-5 text-sm">
          <p>Lớp: {assignment.class.name}</p>
          <p className="mt-1">
            Hạn nộp: {formatDate(assignment.dueAt)}
          </p>
        </div>
      </section>

      {assignment.exercise.content && (
        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">
            Nội dung bài đọc
          </h2>

          <p className="whitespace-pre-wrap leading-8 text-slate-700">
            {assignment.exercise.content}
          </p>
        </section>
      )}

      {!questions.length && (
        <div className="rounded-xl bg-amber-50 p-5 text-amber-800">
          Bài tập chưa có câu hỏi.
        </div>
      )}

      <div className="space-y-5">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            selected={answers[question.id]}
            onSelect={(value) =>
              handleAnswer(question.id, value)
            }
          />
        ))}
      </div>

      <div className="sticky bottom-0 mt-8 border-t bg-white/95 px-4 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="font-semibold">Tiến độ</p>

            <p className="text-sm text-slate-500">
              {
                questions.filter(
                  (q) => answers[q.id]?.trim()
                ).length
              }
              /{questions.length} câu
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              submitted ||
              questions.length === 0
            }
            className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Đang nộp..." : "Nộp bài"}
          </button>
        </div>
      </div>
    </PageContainer>
  );
}

// ======================================================
// QUESTION CARD
// ======================================================

function QuestionCard({
  question,
  index,
  selected,
  onSelect,
}: {
  question: Question;
  index: number;
  selected?: string;
  onSelect: (answer: string) => void;
}) {
  const options = question.options ?? [];

  const textType = [
    "FILL_BLANK",
    "REORDER",
    "MATCHING",
  ].includes(question.type);

  const trueFalseFallback =
    question.type === "TRUE_FALSE" &&
    options.length === 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-600">
          {index + 1}
        </div>

        <p className="font-semibold text-slate-800">
          {question.content}
        </p>
      </div>

      {textType ? (
        <div>
          <p className="mb-2 text-sm text-slate-500">
            {question.type === "MATCHING"
              ? "Nhập các cặp nối, ví dụ: 1-B,2-A"
              : question.type === "REORDER"
                ? "Nhập câu đã sắp xếp đúng thứ tự"
                : "Nhập từ hoặc cụm từ còn thiếu"}
          </p>

          <input
            type="text"
            value={selected ?? ""}
            onChange={(e) => onSelect(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3"
            placeholder="Nhập câu trả lời"
          />

          {question.type === "MATCHING" &&
            options.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {options.map((option) => (
                  <li key={option.id}>
                    {option.label}. {option.content}
                  </li>
                ))}
              </ul>
            )}
        </div>
      ) : trueFalseFallback ? (
        <div className="flex gap-4">
          {["True", "False"].map((value) => (
            <label
              key={value}
              className="flex items-center gap-2"
            >
              <input
                type="radio"
                name={question.id}
                checked={selected === value}
                onChange={() => onSelect(value)}
              />

              {value}
            </label>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                selected === option.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={selected === option.id}
                onChange={() => onSelect(option.id)}
              />

              <span className="font-semibold">
                {option.label}.
              </span>

              <span>{option.content}</span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

// ======================================================
// REVIEW PAGE
// ======================================================


function ReviewPage({ data }: { data: ReviewData }) {
  const isSpeaking = data.exercise.skill === "SPEAKING";

  const speakingRecords = data.questions
    .filter((question) => question.type === "SPEAKING")
    .map((question) => question.speaking);

  const gradedCount = speakingRecords.filter(
    (record) =>
      record &&
      record.grammarScore !== null &&
      record.vocabularyScore !== null
  ).length;

  const totalSpeakingQuestions = speakingRecords.length;

  const allAIGraded =
    totalSpeakingQuestions > 0 &&
    gradedCount === totalSpeakingQuestions;

  const hasAnyAIGrade = gradedCount > 0;

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          href="/student/assignments"
          className="text-sm font-medium text-blue-600"
        >
          ← Quay lại bài tập
        </Link>
      </div>

      {/* HEADER */}
      <section className="mb-6 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 p-7 text-white">
        <p className="text-sm text-green-100">
          Bài đã nộp
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          {data.assignment.title || data.exercise.title}
        </h1>

        <div className="mt-6 flex flex-wrap gap-8">
          <div>
            <p className="text-sm text-green-100">
              {isSpeaking ? "Điểm tổng Speaking" : "Điểm"}
            </p>

            <p className="mt-2 text-3xl font-bold">
              {data.submission.score != null
                ? Number(data.submission.score).toFixed(2)
                : "--"}
            </p>
          </div>

          <div>
            <p className="text-sm text-green-100">
              Ngày nộp
            </p>

            <p className="mt-2 font-semibold">
              {formatDate(data.submission.submittedAt)}
            </p>
          </div>

          <div>
            <p className="text-sm text-green-100">
              Số câu
            </p>

            <p className="mt-2 font-semibold">
              {data.questions.length}
            </p>
          </div>
        </div>
      </section>

      {/* LISTENING AUDIO */}
      {data.exercise.skill === "LISTENING" && (
        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">
            Nghe lại bài Listening
          </h2>

          {data.exercise.audioUrl ? (
            <audio
              controls
              preload="metadata"
              src={data.exercise.audioUrl}
              className="w-full"
            />
          ) : (
            <p className="text-sm text-amber-700">
              Bài chưa có audio.
            </p>
          )}
        </section>
      )}

      {/* READING CONTENT */}
      {data.exercise.content && (
        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">
            Nội dung bài học
          </h2>

          <p className="whitespace-pre-wrap leading-8 text-slate-700">
            {data.exercise.content}
          </p>
        </section>
      )}

      {/* SPEAKING AI STATUS */}
      {isSpeaking && (
        <section className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-blue-900">
            Kết quả đánh giá Speaking
          </h2>

          {allAIGraded ? (
            <>
              <p className="mt-3 text-sm text-green-800">
                AI đã hoàn thành đánh giá Grammar và Vocabulary
                cho tất cả câu hỏi.
              </p>

              <div className="mt-4 rounded-xl bg-white p-4">
                <p className="font-semibold text-slate-800">
                  Trạng thái: Đã chấm bằng AI
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {gradedCount}/{totalSpeakingQuestions} câu đã được đánh giá.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm leading-6 text-blue-800">
                {hasAnyAIGrade
                  ? `AI đã đánh giá ${gradedCount}/${totalSpeakingQuestions} câu.`
                  : "Bài Speaking đã được nộp. Hệ thống đang chờ hoàn tất đánh giá AI."}
              </p>

              <p className="mt-2 text-sm text-blue-800">
                AI chỉ đánh giá Grammar và Vocabulary dựa trên
                transcript. Pronunciation và Fluency cần giáo viên
                đánh giá.
              </p>

              <p className="mt-3 text-sm font-medium text-blue-900">
                Trạng thái: Chờ hoàn tất đánh giá / giáo viên chấm điểm.
              </p>
            </>
          )}

          <p className="mt-3 text-xs leading-5 text-blue-700">
            Lưu ý: Điểm tổng Speaking chưa được xác định cho đến
            khi có đủ kết quả đánh giá theo các tiêu chí của bài.
          </p>
        </section>
      )}

      {/* REVIEW QUESTIONS */}
      <div className="space-y-5">
        {data.questions.map((question, index) => {
          if (question.type === "SPEAKING") {
            return (
              <SpeakingReview
                key={question.id}
                question={question.content}
                speaking={question.speaking ?? null}
                score={question.earnedScore}
              />
            );
          }

          if (question.type === "WRITING") {
            return (
              <WritingReview
                key={question.id}
                prompt={question.content}
                answer={question.studentAnswer}
                score={question.earnedScore}
                feedback={question.feedback}
              />
            );
          }

          return (
            <ReviewQuestionCard
              key={question.id}
              question={question}
              index={index}
            />
          );
        })}
      </div>
    </PageContainer>
  );
}


// ======================================================
// REVIEW QUESTION CARD
// ======================================================

function ReviewQuestionCard({
  question,
  index,
}: {
  question: ReviewQuestion;
  index: number;
}) {
  const options = question.options ?? [];

  const studentAnswer = question.studentAnswer ?? "";

  const correctOption = options.find(
    (option) => option.isCorrect
  );

  const chosenOption = options.find(
    (option) =>
      option.id === studentAnswer ||
      option.label.toLowerCase() ===
        studentAnswer.trim().toLowerCase()
  );

  const correctDisplay = correctOption
    ? `${correctOption.label}. ${correctOption.content}`
    : question.correctAnswer ||
      "Chưa có đáp án chuẩn";

  const studentDisplay = chosenOption
    ? `${chosenOption.label}. ${chosenOption.content}`
    : studentAnswer ||
      "Không có đáp án được lưu";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-600">
          {index + 1}
        </div>

        <div>
          <p className="font-semibold text-slate-800">
            {question.content}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {question.isCorrect === true && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                ✓ Đúng
              </span>
            )}

            {question.isCorrect === false && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">
                ✗ Sai
              </span>
            )}

            {question.isCorrect == null && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Chưa có kết quả đúng/sai
              </span>
            )}

            {question.earnedScore != null && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Điểm:{" "}
                {Number(
                  question.earnedScore
                ).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      {options.length > 0 && (
        <div className="mb-4 space-y-2">
          {options.map((option) => {
            const selected =
              option.id === studentAnswer ||
              option.label.toLowerCase() ===
                studentAnswer.trim().toLowerCase();

            return (
              <div
                key={option.id}
                className={`flex items-center gap-2 rounded-xl border p-3 ${
                  selected && !option.isCorrect
                    ? "border-red-300 bg-red-50"
                    : option.isCorrect
                      ? "border-green-300 bg-green-50"
                      : "border-slate-200"
                }`}
              >
                <span className="font-semibold">
                  {option.label}.
                </span>

                <span>{option.content}</span>

                {selected && (
                  <span className="ml-auto text-xs font-semibold text-blue-700">
                    Bạn đã chọn
                  </span>
                )}

                {option.isCorrect && (
                  <span className="text-xs font-semibold text-green-700">
                    ✓ Đáp án đúng
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-4 rounded-xl bg-slate-50 p-4 text-sm">
        <div>
          <p className="font-semibold text-slate-500">
            Đáp án của bạn
          </p>

          <p className="mt-1 whitespace-pre-wrap text-slate-800">
            {studentDisplay}
          </p>
        </div>

        <div>
          <p className="font-semibold text-slate-500">
            Đáp án đúng
          </p>

          <p className="mt-1 whitespace-pre-wrap text-green-700">
            {correctDisplay}
          </p>
        </div>

        {question.explanation && (
          <div>
            <p className="font-semibold text-slate-500">
              Giải thích
            </p>

            <p className="mt-1 whitespace-pre-wrap text-slate-700">
              {question.explanation}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ======================================================
// PAGE CONTAINER
// ======================================================

function PageContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-20 items-center justify-between px-8">
          <div>
            <p className="text-sm text-slate-500">
              Student
            </p>

            <h1 className="text-xl font-bold text-slate-800">
              Study English
            </h1>
          </div>

          <Link
            href="/student"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-8">
        {children}
      </main>
    </div>
  );
}
