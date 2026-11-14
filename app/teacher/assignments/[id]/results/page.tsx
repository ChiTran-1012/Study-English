
"use client";

import Link from "next/link";
import TeacherSpeakingGrading from "@/app/components/speaking/TeacherSpeakingGrading";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// ======================================================
// TYPES
// ======================================================

type StudentResult = {
  student: {
    id: string;
    name: string;
    email: string;
  };

  status: "SUBMITTED" | "NOT_SUBMITTED";
  score: number | null;
  submittedAt: string | null;
  submissionId: string | null;
};

type AssignmentResult = {
  assignment: {
    id: string;
    title: string | null;
    description: string | null;

    exercise: {
      id: string;
      title: string;
      skill: string;
      difficulty: string;
    };

    class: {
      id: string;
      name: string;
      code: string;
      grade: number;
    } | null;

    startAt: string;
    dueAt: string | null;
  };

  statistics: {
    totalStudents: number;
    submittedStudents: number;
    notSubmittedStudents: number;
    averageScore: number | null;
  };

  results: StudentResult[];
};

type SpeakingFeedback = {
  rubric?: {
    content?: number;
    grammar?: number;
    vocabulary?: number;
  };
  feedback?: string;
  corrections?: string[];
  strengths?: string[];
};

type SpeakingRecord = {
  recordId: string;
  transcript: string | null;
  mimeType: string;
  audioUrl: string;

  pronunciationScore: number | null;
  fluencyScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;

  feedback: string | null;
  teacherPronunciationScore?: number | null;
  teacherFluencyScore?: number | null;
  teacherGrammarScore?: number | null;
  teacherVocabularyScore?: number | null;
  teacherFeedback?: string | null;
  teacherGradedAt?: string | null;
};


type SpeakingQuestion = {
  id: string;
  order: number;
  content: string;

  // Các trường API mới trả về
  recordId?: string | null;
  audioUrl?: string | null;
  transcript?: string | null;
  grammarScore?: number | null;
  vocabularyScore?: number | null;
  pronunciationScore?: number | null;
  fluencyScore?: number | null;
  teacherFeedback?: string | null;
  teacherGradedAt?: string | null;
  aiFeedback?: string | null;

  // Tương thích với API cũ
  type?: string;
  studentAnswer?: string | null;
  score?: number | null;
  feedback?: string | null;
  speaking?: SpeakingRecord | null;
};


type SpeakingDetail = {
  assignment: {
    id: string;
    title: string;
    exerciseTitle: string;
    skill: string;
    class: {
      id: string;
      name: string;
      grade: number;
    };
  };

  submission: {
    id: string;
    score: number | null;
    submittedAt: string | null;
    student: {
      id: string;
      name: string;
      email: string;
    };
  };

  questions: SpeakingQuestion[];
};

// ======================================================
// HELPERS
// ======================================================

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("vi-VN");
}

function formatScore(score: number | null | undefined) {
  if (score == null) return "—";

  return Number(score).toFixed(2);
}

function parseFeedback(
  raw: string | null
): SpeakingFeedback | null {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);

    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      return value as SpeakingFeedback;
    }
  } catch {
    return { feedback: raw };
  }

  return { feedback: raw };
}

async function readResponse(response: Response) {
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

export default function AssignmentResultsPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] =
    useState<AssignmentResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSubmissionId, setSelectedSubmissionId] =
    useState<string | null>(null);

  const [speakingDetail, setSpeakingDetail] =
    useState<SpeakingDetail | null>(null);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [detailError, setDetailError] = useState("");

  // ====================================================
  // LOAD RESULTS
  // ====================================================

  const fetchResults = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/assignments/${encodeURIComponent(id)}/results`,
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error ||
          result.message ||
          `API lỗi ${response.status}`
        );
      }

      if (!result?.assignment || !Array.isArray(result.results)) {
        throw new Error("Dữ liệu kết quả không hợp lệ.");
      }

      setData(result as AssignmentResult);
    } catch (err) {
      console.error("LOAD RESULTS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải kết quả."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void fetchResults());
  }, [fetchResults]);

  // ====================================================
  // LOAD SPEAKING DETAIL
  // ====================================================

  async function openSpeakingDetail(
    submissionId: string,
    showLoading = true
  ) {
    setSelectedSubmissionId(submissionId);
    if (showLoading) setSpeakingDetail(null);
    setDetailError("");
    if (showLoading) setDetailLoading(true);

    try {
      const response = await fetch(
        `/api/teacher/assignments/${encodeURIComponent(
          id
        )}/submissions/${encodeURIComponent(
          submissionId
        )}`,
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          result.message ||
          result.error ||
          "Không thể tải chi tiết Speaking."
        );
      }

      if (!result?.submission || !Array.isArray(result.questions)) {
        throw new Error(
          "API chi tiết Speaking trả về dữ liệu không hợp lệ."
        );
      }

      setSpeakingDetail(result as SpeakingDetail);
    } catch (err) {
      console.error("LOAD SPEAKING DETAIL ERROR:", err);

      setDetailError(
        err instanceof Error
          ? err.message
          : "Không thể tải bài Speaking."
      );
    } finally {
      if (showLoading) setDetailLoading(false);
    }
  }

  function closeSpeakingDetail() {
    setSelectedSubmissionId(null);
    setSpeakingDetail(null);
    setDetailError("");
  }

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="p-6">
        <p>Đang tải kết quả...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-100 p-4 text-red-700">
          <p>{error}</p>

          <button
            type="button"
            onClick={() => void fetchResults()}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        Không có dữ liệu.
      </div>
    );
  }

  const { assignment, statistics, results } = data;

  const isSpeaking =
    assignment.exercise.skill === "SPEAKING";

  // ====================================================
  // UI
  // ====================================================

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}

      <div>
        <Link
          href="/teacher/assignments"
          className="text-blue-600 hover:underline"
        >
          ← Quay lại Assignment
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {assignment.title ||
                assignment.exercise.title}
            </h1>

            {assignment.description && (
              <p className="mt-1 text-gray-600">
                {assignment.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void fetchResults()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Làm mới kết quả
          </button>
        </div>
      </div>

      {/* ASSIGNMENT INFORMATION */}

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard
          label="Bài tập"
          value={assignment.exercise.title}
        />

        <InfoCard
          label="Lớp"
          value={assignment.class?.name || "—"}
        />

        <InfoCard
          label="Kỹ năng"
          value={assignment.exercise.skill}
        />
      </div>

      {/* STATISTICS */}

      <section>
        <h2 className="mb-4 text-xl font-bold">
          Thống kê
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Tổng học sinh"
            value={statistics.totalStudents}
          />

          <StatCard
            label="Đã nộp"
            value={statistics.submittedStudents}
            color="text-green-600"
          />

          <StatCard
            label="Chưa nộp"
            value={statistics.notSubmittedStudents}
            color="text-orange-600"
          />

          <StatCard
            label="Điểm trung bình"
            value={
              statistics.averageScore == null
                ? "—"
                : formatScore(statistics.averageScore)
            }
            color="text-blue-600"
          />
        </div>

        {isSpeaking && (
          <p className="mt-3 text-sm text-gray-500">
            AI đánh giá 4 tiêu chí từ audio và transcript. Điểm AI
            là ước lượng; giáo viên có thể nghe lại và điều chỉnh.
          </p>
        )}
      </section>

      {/* STUDENT RESULTS */}

      <section>
        <h2 className="mb-4 text-xl font-bold">
          Kết quả học sinh
        </h2>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[850px]">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">
                  Học sinh
                </th>
                <th className="px-4 py-3 text-left">
                  Email
                </th>
                <th className="px-4 py-3 text-center">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-center">
                  Điểm
                </th>
                <th className="px-4 py-3 text-left">
                  Thời gian nộp
                </th>

                {isSpeaking && (
                  <th className="px-4 py-3 text-center">
                    Chi tiết
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSpeaking ? 7 : 6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Chưa có học sinh trong lớp.
                  </td>
                </tr>
              ) : (
                results.map((result, index) => (
                  <tr
                    key={result.student.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {result.student.name}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {result.student.email}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {result.status === "SUBMITTED" ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                          Đã nộp
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                          Chưa nộp
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {result.score !== null ? (
                        <span className="font-bold text-blue-700">
                          {formatScore(result.score)}
                        </span>
                      ) : result.status === "SUBMITTED" ? (
                        <span className="text-sm text-amber-600">
                          Chờ chấm
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(result.submittedAt)}
                    </td>

                    {isSpeaking && (
                      <td className="px-4 py-3 text-center">
                        {result.status === "SUBMITTED" &&
                          result.submissionId ? (
                          <button
                            type="button"
                            onClick={() =>
                              void openSpeakingDetail(
                                result.submissionId!
                              )
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Xem Speaking
                          </button>
                        ) : (
                          <span className="text-gray-400">
                            —
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SPEAKING DETAIL */}

      {isSpeaking && selectedSubmissionId && (
        <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-blue-900">
              Chi tiết bài Speaking
            </h2>

            <button
              type="button"
              onClick={closeSpeakingDetail}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>

          {detailLoading && (
            <p className="py-8 text-center text-gray-500">
              Đang tải bài Speaking...
            </p>
          )}

          {detailError && (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">
              {detailError}
            </div>
          )}

          {!detailLoading &&
            !detailError &&
            speakingDetail && (
              <SpeakingDetailView
                data={speakingDetail}
                onGradeSaved={async () => {
                  await Promise.all([
                    fetchResults(),
                    openSpeakingDetail(selectedSubmissionId, false),
                  ]);
                }}
              />
            )}
        </section>
      )}
    </div>
  );
}

// ======================================================
// INFO CARD
// ======================================================

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}

// ======================================================
// STAT CARD
// ======================================================

function StatCard({
  label,
  value,
  color = "text-gray-900",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className={`mt-2 text-3xl font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}

// ======================================================
// SPEAKING DETAIL VIEW
// ======================================================

function SpeakingDetailView({
  data,
  onGradeSaved,
}: {
  data: SpeakingDetail;
  onGradeSaved: () => Promise<void>;
}) {
  const { submission, questions } = data;

  return (
    <div className="space-y-6">
      {/* STUDENT INFORMATION */}

      <div className="grid gap-4 rounded-xl bg-slate-50 p-5 md:grid-cols-3">
        <div>
          <p className="text-sm text-gray-500">
            Học sinh
          </p>

          <p className="mt-1 font-semibold">
            {submission.student.name}
          </p>

          <p className="text-sm text-gray-500">
            {submission.student.email}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">
            Điểm tổng Speaking
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-700">
            {submission.score === null
              ? "Chờ chấm"
              : `${formatScore(submission.score)}/10`}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">
            Ngày nộp
          </p>

          <p className="mt-1 font-semibold">
            {formatDate(submission.submittedAt)}
          </p>
        </div>
      </div>

      {/* QUESTIONS */}

      <div className="space-y-5">
        {questions.map((question, index) => {

          const speaking: SpeakingRecord | null =
            question.speaking ??
            (question.recordId
              ? {
                recordId: question.recordId,
                audioUrl: question.audioUrl ?? "",
                transcript: question.transcript ?? null,
                mimeType: "",
                pronunciationScore:
                  question.pronunciationScore ?? null,
                fluencyScore: question.fluencyScore ?? null,
                grammarScore: question.grammarScore ?? null,
                vocabularyScore: question.vocabularyScore ?? null,
                feedback: question.aiFeedback ?? null,
                teacherPronunciationScore:
                  question.pronunciationScore ?? null,
                teacherFluencyScore:
                  question.fluencyScore ?? null,
                teacherFeedback:
                  question.teacherFeedback ?? null,
                teacherGradedAt:
                  question.teacherGradedAt ?? null,
              }
              : null);


          const feedback = parseFeedback(
            speaking?.feedback ??
            question.feedback ??
            null
          );

          return (
            <div
              key={question.id}
              className="rounded-xl border border-gray-200 p-5"
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-700">
                  {index + 1}
                </span>

                <div>
                  <h3 className="font-semibold text-gray-900">
                    {question.content}
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Điểm nội dung:{" "}
                    {question.score === null
                      ? "Chờ chấm"
                      : `${formatScore(question.score)}/10`}
                  </p>
                </div>
              </div>

              {!speaking ? (
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                  Không tìm thấy bản ghi Speaking
                  cho câu hỏi này.
                </div>
              ) : (
                <div className="space-y-5">
                  {/* AUDIO */}

                  <div>
                    <h4 className="mb-2 font-semibold">
                      Bản ghi âm
                    </h4>

                    <audio
                      controls
                      preload="metadata"
                      src={speaking.audioUrl}
                      className="w-full"
                    >
                      Trình duyệt không hỗ trợ audio.
                    </audio>
                  </div>

                  {/* TRANSCRIPT */}

                  <div className="rounded-xl bg-indigo-50 p-4">
                    <h4 className="font-semibold text-indigo-900">
                      Transcript
                    </h4>

                    <p className="mt-2 whitespace-pre-wrap leading-7 text-gray-700">
                      {speaking.transcript ||
                        "Chưa có transcript."}
                    </p>
                  </div>

                  {/* SCORES */}

                  <div>
                    <h4 className="mb-3 font-semibold">
                      Điểm thành phần
                    </h4>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricCard
                        label="Ngữ pháp"
                        value={speaking.grammarScore}
                      />

                      <MetricCard
                        label="Từ vựng"
                        value={speaking.vocabularyScore}
                      />

                      <MetricCard
                        label="Phát âm (Giáo viên)"
                        value={
                          speaking.teacherPronunciationScore ??
                          speaking.pronunciationScore
                        }
                        maximum={10}
                      />

                      <MetricCard
                        label="Độ trôi chảy (Giao vien)"
                        value={speaking.teacherFluencyScore ??
                          speaking.fluencyScore}
                      />
                    </div>
                  </div>

                  {/* AI FEEDBACK */}

                  {feedback && (
                    <div className="space-y-4 rounded-xl bg-green-50 p-5">
                      <h4 className="font-bold text-green-900">
                        Nhận xét AI
                      </h4>

                      {feedback.rubric && (
                        <div className="grid gap-3 sm:grid-cols-3">
                          <MetricCard
                            label="Nội dung"
                            value={
                              feedback.rubric.content ??
                              null
                            }
                            maximum={4}
                          />

                          <MetricCard
                            label="Ngữ pháp"
                            value={
                              feedback.rubric.grammar ??
                              null
                            }
                            maximum={3}
                          />

                          <MetricCard
                            label="Từ vựng"
                            value={
                              feedback.rubric.vocabulary ??
                              null
                            }
                            maximum={3}
                          />
                        </div>
                      )}

                      {feedback.feedback && (
                        <p className="whitespace-pre-wrap text-sm leading-7 text-green-900">
                          {feedback.feedback}
                        </p>
                      )}

                      {Boolean(feedback.strengths?.length) && (
                        <div>
                          <p className="font-semibold text-green-900">
                            Điểm tốt
                          </p>

                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-green-900">
                            {feedback.strengths?.map(
                              (item, itemIndex) => (
                                <li key={itemIndex}>
                                  {item}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {Boolean(feedback.corrections?.length) && (
                        <div>
                          <p className="font-semibold text-green-900">
                            Cần cải thiện
                          </p>

                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-green-900">
                            {feedback.corrections?.map(
                              (item, itemIndex) => (
                                <li key={itemIndex}>
                                  {item}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {speaking.teacherGradedAt && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <p className="font-semibold text-blue-900">
                        Đã được giáo viên chấm
                      </p>
                      <p className="mt-1 text-sm text-blue-800">
                        Thời gian: {formatDate(speaking.teacherGradedAt)}
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label="Phát âm" value={speaking.teacherPronunciationScore ?? null} maximum={10} />
                        <MetricCard label="Độ trôi chảy" value={speaking.teacherFluencyScore ?? null} maximum={10} />
                        <MetricCard label="Ngữ pháp" value={speaking.teacherGrammarScore ?? null} maximum={10} />
                        <MetricCard label="Từ vựng" value={speaking.teacherVocabularyScore ?? null} maximum={10} />
                      </div>
                      {speaking.teacherFeedback && (
                        <p className="mt-3 whitespace-pre-wrap text-sm text-blue-900">
                          <strong>Nhận xét giáo viên:</strong> {speaking.teacherFeedback}
                        </p>
                      )}
                    </div>
                  )}


                  <TeacherSpeakingGrading
                    key={speaking.recordId}
                    assignmentId={data.assignment.id}
                    submissionId={submission.id}
                    recordId={speaking.recordId}
                    questionId={question.id}
                    initialScores={{
                      pronunciationScore:
                        speaking.teacherPronunciationScore ?? null,
                      fluencyScore:
                        speaking.teacherFluencyScore ?? null,
                      grammarScore:
                        speaking.grammarScore,
                      vocabularyScore:
                        speaking.vocabularyScore,
                    }}
                    initialFeedback={speaking.teacherFeedback ?? ""}
                    onSaved={() => {
                      void onGradeSaved();
                    }}
                  />


                  {question.score === null && (
                    <p className="text-sm text-amber-700">
                      Câu trả lời này chưa có điểm.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-sm text-gray-500">
        Lưu ý: điểm AI dựa trên audio và transcript chỉ là đánh giá
        ước lượng, không thay thế việc nghe và nhận xét của giáo viên.
        Điểm giáo viên được lưu riêng với điểm AI.
      </p>
    </div>
  );
}

// ======================================================
// METRIC CARD
// ======================================================

function MetricCard({
  label,
  value,
  maximum,
}: {
  label: string;
  value: number | null;
  maximum?: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-gray-900">
        {value === null
          ? "—"
          : `${Number(value).toFixed(1)}${maximum ? `/${maximum}` : ""
          }`}
      </p>
    </div>
  );
}
