
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  AudioLines,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Headphones,
  Loader2,
  MessageSquareText,
  Mic2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
  AlertCircle,
} from "lucide-react";

type Student = {
  id: string;
  name: string;
  email: string;
};

type SubmissionItem = {
  id: string;
  student: Student;
  submittedAt: string | null;
  score: number | null;
  aiReady: boolean;
  teacherReady: boolean;
  status: string;
};

type AssignmentInfo = {
  id: string;
  title: string;
  className?: string;
};

type SpeakingQuestion = {
  id: string;
  order: number;
  content: string;
  recordId: string | null;
  audioUrl: string | null;
  transcript: string | null;
  grammarScore: number | null;
  vocabularyScore: number | null;
  pronunciationScore: number | null;
  fluencyScore: number | null;
  teacherFeedback: string;
  teacherGradedAt: string | null;
  aiFeedback: string | null;
};

type SubmissionDetail = {
  submission: {
    id: string;
    score: number | null;
    submittedAt: string | null;
    student: Student;
  };
  questions: SpeakingQuestion[];
};

type GradeForm = {
  pronunciationScore: string;
  fluencyScore: string;
  feedback: string;
};

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("API trả về dữ liệu không hợp lệ");
  }
}

function formatDate(value: string | null) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayScore(value: number | null) {
  return value == null
    ? "--"
    : Number(value).toFixed(2);
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "S";
}

function getStatus(status: string) {
  if (status === "COMPLETED") {
    return {
      label: "Đã chấm",
      style: "bg-emerald-50 text-emerald-700 border-emerald-100",
    };
  }

  if (status === "WAITING_AI") {
    return {
      label: "Chờ AI",
      style: "bg-amber-50 text-amber-700 border-amber-100",
    };
  }

  return {
    label: "Chờ giáo viên",
    style: "bg-blue-50 text-blue-700 border-blue-100",
  };
}

export default function TeacherSpeakingGradingPage() {
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] =
    useState<AssignmentInfo | null>(null);

  const [submissions, setSubmissions] =
    useState<SubmissionItem[]>([]);

  const [selectedId, setSelectedId] = useState("");

  const [detail, setDetail] =
    useState<SubmissionDetail | null>(null);

  const [forms, setForms] = useState<
    Record<string, GradeForm>
  >({});

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ==========================================
  // LOAD SUBMISSIONS
  // ==========================================

  const loadSubmissions = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(
        `/api/teacher/assignments/${encodeURIComponent(
          assignmentId
        )}/submissions`,
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể tải danh sách"
        );
      }

      setAssignment(data.assignment);
      setSubmissions(data.submissions ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  // ==========================================
  // LOAD DETAIL
  // ==========================================

  const loadDetail = useCallback(
    async (submissionId: string) => {
      try {
        setLoadingDetail(true);
        setError("");

        const response = await fetch(
          `/api/teacher/assignments/${encodeURIComponent(
            assignmentId
          )}/submissions/${encodeURIComponent(
            submissionId
          )}`,
          {
            credentials: "same-origin",
            cache: "no-store",
          }
        );

        const data = await readResponse(response);

        if (!response.ok) {
          throw new Error(
            data.message || "Không thể tải bài nộp"
          );
        }

        const result = data as SubmissionDetail;
        const initialForms: Record<string, GradeForm> = {};

        for (const question of result.questions) {
          initialForms[question.id] = {
            pronunciationScore:
              question.pronunciationScore == null
                ? ""
                : String(question.pronunciationScore),
            fluencyScore:
              question.fluencyScore == null
                ? ""
                : String(question.fluencyScore),
            feedback: question.teacherFeedback ?? "",
          };
        }

        setForms(initialForms);
        setDetail(result);
      } catch (err) {
        setDetail(null);
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải bài nộp"
        );
      } finally {
        setLoadingDetail(false);
      }
    },
    [assignmentId]
  );

  useEffect(() => {
    if (assignmentId) {
      queueMicrotask(() => void loadSubmissions());
    }
  }, [assignmentId, loadSubmissions]);

  // ==========================================
  // SELECT STUDENT
  // ==========================================

  function selectSubmission(id: string) {
    setSelectedId(id);
    setDetail(null);
    setMessage("");
    void loadDetail(id);
  }

  // ==========================================
  // UPDATE FORM
  // ==========================================

  function updateForm(
    questionId: string,
    field: keyof GradeForm,
    value: string
  ) {
    setForms((previous) => ({
      ...previous,
      [questionId]: {
        ...previous[questionId],
        [field]: value,
      },
    }));
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  const statistics = useMemo(() => {
    return {
      total: submissions.length,
      completed: submissions.filter(
        (s) => s.status === "COMPLETED"
      ).length,
      waitingAI: submissions.filter(
        (s) => s.status === "WAITING_AI"
      ).length,
      waitingTeacher: submissions.filter(
        (s) =>
          s.status !== "COMPLETED" &&
          s.status !== "WAITING_AI"
      ).length,
    };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return submissions.filter((item) => {
      const matchesSearch =
        item.student.name.toLowerCase().includes(keyword) ||
        item.student.email.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "WAITING_TEACHER"
          ? item.status !== "COMPLETED" &&
            item.status !== "WAITING_AI"
          : item.status === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [submissions, search, statusFilter]);

  const readyQuestions = useMemo(() => {
    if (!detail) return 0;

    return detail.questions.filter((question) => {
      const form = forms[question.id];

      if (
        !form ||
        form.pronunciationScore.trim() === "" ||
        form.fluencyScore.trim() === ""
      ) {
        return false;
      }

      const p = Number(form.pronunciationScore);
      const f = Number(form.fluencyScore);

      return (
        Number.isFinite(p) &&
        Number.isFinite(f) &&
        p >= 0 &&
        p <= 10 &&
        f >= 0 &&
        f <= 10 &&
        question.grammarScore != null &&
        question.vocabularyScore != null
      );
    }).length;
  }, [detail, forms]);

  // ==========================================
  // SAVE GRADES
  // ==========================================

  async function saveGrades() {
    if (!detail || saving) return;

    setError("");
    setMessage("");

    const grades = [];

    for (const question of detail.questions) {
      const form = forms[question.id];

      if (!form) {
        setError("Thiếu dữ liệu chấm điểm");
        return;
      }

      if (
        form.pronunciationScore.trim() === "" ||
        form.fluencyScore.trim() === ""
      ) {
        setError(
          `Bạn chưa nhập đủ điểm câu ${question.order}`
        );
        return;
      }

      const pronunciationScore = Number(
        form.pronunciationScore
      );

      const fluencyScore = Number(form.fluencyScore);

      if (
        !Number.isFinite(pronunciationScore) ||
        !Number.isFinite(fluencyScore) ||
        pronunciationScore < 0 ||
        pronunciationScore > 10 ||
        fluencyScore < 0 ||
        fluencyScore > 10
      ) {
        setError(
          `Điểm câu ${question.order} phải từ 0 đến 10`
        );
        return;
      }

      if (
        question.grammarScore == null ||
        question.vocabularyScore == null
      ) {
        setError(
          `Câu ${question.order} chưa được AI chấm`
        );
        return;
      }

      grades.push({
        questionId: question.id,
        pronunciationScore,
        fluencyScore,
        feedback: form.feedback,
      });
    }

    if (!grades.length) {
      setError("Bài chưa có câu hỏi Speaking");
      return;
    }

    if (
      !window.confirm(
        "Bạn muốn lưu điểm Speaking cho học sinh này?"
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/teacher/assignments/${encodeURIComponent(
          assignmentId
        )}/submissions/${encodeURIComponent(
          detail.submission.id
        )}/grade`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ grades }),
        }
      );

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể lưu điểm"
        );
      }

      setMessage(
        `Chấm Speaking thành công! Điểm tổng: ${Number(
          result.score
        ).toFixed(2)}/10`
      );

      await Promise.all([
        loadSubmissions(),
        loadDetail(detail.submission.id),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Lưu điểm thất bại"
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <div className="border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Teacher Portal / Speaking Grading
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Chấm điểm Speaking
            </h1>
          </div>

          <Link
            href="/teacher/assignments"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Quay lại
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-7 text-white shadow-sm">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute bottom-0 right-24 h-24 w-24 rounded-full bg-white/5" />

          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-blue-50">
                <Sparkles size={14} />
                AI + Teacher Assessment
              </div>

              <h2 className="text-2xl font-bold md:text-3xl">
                {assignment?.title ?? "Bài Speaking"}
              </h2>

              <p className="mt-2 text-sm text-blue-100">
                Đánh giá phát âm, độ trôi chảy, ngữ pháp và từ vựng.
              </p>

              {assignment?.className && (
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-blue-100">
                  <GraduationCap size={17} />
                  Lớp {assignment.className}
                </div>
              )}
            </div>

            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15">
              <Mic2 size={42} />
            </div>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            title="Bài đã nộp"
            value={statistics.total}
            icon={Users}
            color="blue"
          />

          <StatCard
            title="Đã chấm"
            value={statistics.completed}
            icon={CheckCircle2}
            color="green"
          />

          <StatCard
            title="Chờ giáo viên"
            value={statistics.waitingTeacher}
            icon={ClipboardCheck}
            color="purple"
          />

          <StatCard
            title="Chờ AI"
            value={statistics.waitingAI}
            icon={Clock3}
            color="orange"
          />
        </section>

        {/* ALERTS */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            <CheckCircle2 size={20} className="shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="grid items-start gap-6 lg:grid-cols-12">
          {/* STUDENT LIST */}
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6 lg:col-span-4">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-800">
                    Danh sách học sinh
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredSubmissions.length} học sinh
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadSubmissions()}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                  title="Làm mới danh sách"
                >
                  <RefreshCw size={17} />
                </button>
              </div>

              <div className="relative mt-4">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên hoặc email..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-400"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="WAITING_TEACHER">
                  Chờ giáo viên
                </option>
                <option value="WAITING_AI">Chờ AI</option>
                <option value="COMPLETED">Đã chấm</option>
              </select>
            </div>

            <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Đang tải...
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="py-12 text-center">
                  <Users
                    size={32}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 text-sm text-slate-500">
                    Không có học sinh phù hợp
                  </p>
                </div>
              ) : (
                filteredSubmissions.map((item) => {
                  const active = selectedId === item.id;
                  const status = getStatus(item.status);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        selectSubmission(item.id)
                      }
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-blue-400 bg-blue-50 shadow-sm"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            active
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {getInitial(item.student.name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {item.student.name}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {item.student.email}
                          </p>
                        </div>

                        <ChevronRight
                          size={17}
                          className={
                            active
                              ? "text-blue-600"
                              : "text-slate-300"
                          }
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.style}`}
                        >
                          {status.label}
                        </span>

                        {item.score != null && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            {displayScore(item.score)}/10
                          </span>
                        )}
                      </div>

                      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock3 size={13} />
                        {formatDate(item.submittedAt)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* GRADING AREA */}
          <section className="space-y-5 lg:col-span-8">
            {!selectedId && (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
                  <Headphones
                    size={38}
                    className="text-blue-600"
                  />
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-800">
                  Bắt đầu chấm Speaking
                </h2>

                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  Chọn một học sinh ở danh sách bên trái
                  để nghe bài nói, xem kết quả AI và nhập
                  điểm đánh giá.
                </p>
              </div>
            )}

            {loadingDetail && (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border bg-white">
                <Loader2
                  size={34}
                  className="animate-spin text-blue-600"
                />
                <p className="mt-4 text-sm text-slate-500">
                  Đang tải bài nói của học sinh...
                </p>
              </div>
            )}

            {detail && !loadingDetail && (
              <>
                {/* STUDENT DETAIL */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-700">
                        {getInitial(
                          detail.submission.student.name
                        )}
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          {detail.submission.student.name}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          {detail.submission.student.email}
                        </p>

                        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock3 size={13} />
                          Nộp:{" "}
                          {formatDate(
                            detail.submission.submittedAt
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-blue-50 px-5 py-3 text-center">
                      <p className="text-xs font-medium text-blue-600">
                        Điểm hiện tại
                      </p>

                      <p className="mt-1 text-2xl font-bold text-blue-700">
                        {detail.submission.score == null
                          ? "--"
                          : displayScore(
                              detail.submission.score
                            )}
                        <span className="text-sm">/10</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        Tiến độ nhập điểm
                      </span>
                      <span className="font-semibold text-blue-600">
                        {readyQuestions}/
                        {detail.questions.length} câu
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{
                          width: `${
                            detail.questions.length
                              ? (readyQuestions /
                                  detail.questions.length) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* QUESTIONS */}
                {detail.questions.map((question) => {
                  const form = forms[question.id];

                  const p =
                    !form ||
                    form.pronunciationScore.trim() === ""
                      ? null
                      : Number(form.pronunciationScore);

                  const f =
                    !form ||
                    form.fluencyScore.trim() === ""
                      ? null
                      : Number(form.fluencyScore);

                  const ready =
                    p != null &&
                    f != null &&
                    Number.isFinite(p) &&
                    Number.isFinite(f) &&
                    p >= 0 &&
                    p <= 10 &&
                    f >= 0 &&
                    f <= 10 &&
                    question.grammarScore != null &&
                    question.vocabularyScore != null;

                  const previewScore = ready
                    ? (
                        (p! +
                          f! +
                          question.grammarScore! +
                          question.vocabularyScore!) /
                        4
                      ).toFixed(2)
                    : "--";

                  return (
                    <article
                      key={question.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* QUESTION HEADER */}
                      <div className="border-b border-slate-100 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                            <BookOpen size={15} />
                            Câu hỏi {question.order}
                          </span>

                          {ready ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                              <CheckCircle2 size={15} />
                              Đủ dữ liệu chấm
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-amber-600">
                              Chưa đủ điểm
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-lg font-bold leading-7 text-slate-800">
                          {question.content}
                        </h3>
                      </div>

                      <div className="space-y-6 p-6">
                        {/* AUDIO */}
                        <div>
                          <SectionTitle
                            icon={Volume2}
                            title="Bản ghi âm học sinh"
                            description="Nghe lại phần trả lời để đánh giá"
                          />

                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            {question.audioUrl ? (
                              <audio
                                controls
                                preload="metadata"
                                src={question.audioUrl}
                                className="w-full"
                              />
                            ) : (
                              <p className="text-sm text-amber-700">
                                Chưa có bản ghi âm.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* TRANSCRIPT */}
                        <div>
                          <SectionTitle
                            icon={AudioLines}
                            title="Transcript"
                            description="Nội dung được chuyển từ giọng nói sang văn bản"
                          />

                          <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
                            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                              {question.transcript ||
                                "Chưa có transcript"}
                            </p>
                          </div>
                        </div>

                        {/* AI SCORES */}
                        <div>
                          <SectionTitle
                            icon={Sparkles}
                            title="Đánh giá từ AI"
                            description="Ngữ pháp và từ vựng"
                          />

                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <ScoreBox
                              label="Ngữ pháp"
                              value={question.grammarScore}
                              color="blue"
                            />

                            <ScoreBox
                              label="Từ vựng"
                              value={question.vocabularyScore}
                              color="purple"
                            />
                          </div>

                          {question.aiFeedback && (
                            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                              <p className="text-xs font-semibold text-blue-700">
                                Nhận xét AI
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {question.aiFeedback}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* TEACHER SCORES */}
                        <div className="border-t border-slate-100 pt-6">
                          <SectionTitle
                            icon={ClipboardCheck}
                            title="Giáo viên đánh giá"
                            description="Nhập điểm phát âm và độ trôi chảy theo thang 10"
                          />

                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <ScoreInput
                              id={`p-${question.id}`}
                              label="Phát âm"
                              value={
                                form?.pronunciationScore ?? ""
                              }
                              onChange={(value) =>
                                updateForm(
                                  question.id,
                                  "pronunciationScore",
                                  value
                                )
                              }
                            />

                            <ScoreInput
                              id={`f-${question.id}`}
                              label="Độ trôi chảy"
                              value={form?.fluencyScore ?? ""}
                              onChange={(value) =>
                                updateForm(
                                  question.id,
                                  "fluencyScore",
                                  value
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* FEEDBACK */}
                        <div>
                          <label
                            htmlFor={`feedback-${question.id}`}
                            className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"
                          >
                            <MessageSquareText
                              size={18}
                              className="text-blue-600"
                            />
                            Nhận xét của giáo viên
                          </label>

                          <textarea
                            id={`feedback-${question.id}`}
                            rows={4}
                            value={form?.feedback ?? ""}
                            onChange={(event) =>
                              updateForm(
                                question.id,
                                "feedback",
                                event.target.value
                              )
                            }
                            placeholder="Nhận xét phát âm, độ trôi chảy và hướng cải thiện cho học sinh..."
                            className="w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        {/* PREVIEW */}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                          <div>
                            <p className="text-sm font-bold text-emerald-900">
                              Điểm câu dự kiến
                            </p>

                            <p className="mt-1 text-xs text-emerald-700">
                              Trung bình của 4 tiêu chí đánh giá
                            </p>
                          </div>

                          <p className="text-3xl font-bold text-emerald-700">
                            {previewScore}
                            <span className="text-sm">/10</span>
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {/* SAVE BAR */}
                <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-xl backdrop-blur">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <ShieldCheck
                          size={18}
                          className="text-blue-600"
                        />
                        Hoàn tất chấm điểm
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Đã nhập đủ {readyQuestions}/
                        {detail.questions.length} câu
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void saveGrades()}
                      disabled={
                        saving ||
                        detail.questions.length === 0
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <Save size={18} />
                      )}

                      {saving
                        ? "Đang lưu điểm..."
                        : "Lưu điểm Speaking"}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Hệ thống kết hợp điểm AI và giáo viên
                    để tính điểm tổng của học sinh.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: typeof Users;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            {title}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-800">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
        <Icon size={18} className="text-blue-600" />
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-800">
          {title}
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function ScoreBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: "blue" | "purple";
}) {
  const colors = {
    blue: {
      container: "border-blue-100 bg-blue-50",
      label: "text-blue-700",
      value: "text-blue-900",
      bar: "bg-blue-500",
    },
    purple: {
      container: "border-purple-100 bg-purple-50",
      label: "text-purple-700",
      value: "text-purple-900",
      bar: "bg-purple-500",
    },
  };

  const style = colors[color];
  const percentage =
    value == null
      ? 0
      : Math.max(0, Math.min(100, value * 10));

  return (
    <div
      className={`rounded-xl border p-5 ${style.container}`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-sm font-semibold ${style.label}`}>
          {label}
        </p>

        <Sparkles size={16} className={style.label} />
      </div>

      <p className={`mt-3 text-2xl font-bold ${style.value}`}>
        {value == null
          ? "--"
          : Number(value).toFixed(1)}
        <span className="ml-1 text-sm">/10</span>
      </p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
        <div
          className={`h-full rounded-full ${style.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ScoreInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
        <span className="ml-2 text-xs font-normal text-slate-400">
          (0–10)
        </span>
      </label>

      <div className="relative">
        <input
          id={id}
          type="number"
          min="0"
          max="10"
          step="0.5"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder="Nhập điểm"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-14 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
          /10
        </span>
      </div>
    </div>
  );
}
