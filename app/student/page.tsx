"use client";

import Link from "next/link";
import { useEffect, useState } from "react";


type ProgressData = {
    totalAssignments: number;
    completedAssignments: number;
    submittedAssignments: number;
    gradedAssignments: number;
    awaitingGrading: number;
    pendingAssignments: number;
    expiredAssignments: number;
    averageScore: number | null;
    scoreScale: number;
    skillProgress: {
        LISTENING: number | null;
        SPEAKING: number | null;
        READING: number | null;
        WRITING: number | null;
    };
};


type Assignment = {
    id: string;
    title?: string | null;
    description?: string | null;
    startAt?: string;
    dueAt?: string | null;

    status:
    | "NOT_STARTED"
    | "SUBMITTED"
    | "EXPIRED";

    submission?: {
        id: string;
        score: number | null;
        submittedAt: string | null;
    } | null;

    exercise: {
        id: string;
        title: string;
        description?: string | null;
        skill:
        | "LISTENING"
        | "SPEAKING"
        | "READING"
        | "WRITING";
        difficulty:
        | "EASY"
        | "MEDIUM"
        | "HARD";
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
};

const skillConfig = {
    LISTENING: {
        name: "Listening",
        icon: "🎧",
        description: "Luyện nghe tiếng Anh",
    },

    SPEAKING: {
        name: "Speaking",
        icon: "🎤",
        description: "Luyện nói tiếng Anh",
    },

    READING: {
        name: "Reading",
        icon: "📖",
        description: "Luyện đọc tiếng Anh",
    },

    WRITING: {
        name: "Writing",
        icon: "✍️",
        description: "Luyện viết tiếng Anh",
    },
};

const difficultyLabel = {
    EASY: "Dễ",
    MEDIUM: "Trung bình",
    HARD: "Khó",
};

function formatDate(date?: string | null) {
    if (!date) return "Không có hạn";

    return new Date(date).toLocaleDateString("vi-VN");
}


// API có thể trả về `submission` hoặc `submissions` (quan hệ Prisma).
// Chỉ xem là đã hoàn thành khi submittedAt thực sự có giá trị.
type ApiAssignment = Assignment & {
    submissions?: Array<{
        id: string;
        score: number | null;
        submittedAt: string | null;
    }>;
};

function normalizeAssignment(item: ApiAssignment): Assignment {
    const submission = item.submissions?.find((s) => s.submittedAt != null)
        ?? item.submissions?.[0]
        ?? item.submission
        ?? null;
    const isSubmitted = submission?.submittedAt != null;
    const isExpired = item.dueAt != null && new Date(item.dueAt).getTime() < Date.now();
    return {
        ...item,
        submission,
        status: isSubmitted ? "SUBMITTED" : isExpired ? "EXPIRED" : "NOT_STARTED",
    };
}

export default function StudentDashboard() {
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadDashboard() {
        try {
            setLoading(true);
            setError("");

            const [progressResponse, assignmentResponse] =
                await Promise.all([
                    fetch("/api/student/progress"),
                    fetch("/api/student/assignments"),
                ]);

            const progressText = await progressResponse.text();
            const assignmentText = await assignmentResponse.text();

            console.log("Progress status:", progressResponse.status);
            console.log("Progress response:", progressText);

            console.log("Assignment status:", assignmentResponse.status);
            console.log("Assignment response:", assignmentText);

            if (!progressResponse.ok) {
                throw new Error("Không thể tải tiến độ học tập");
            }

            if (!assignmentResponse.ok) {
                throw new Error("Không thể tải danh sách bài tập");
            }

            const progressData = progressText
                ? JSON.parse(progressText)
                : null;

            const assignmentData = assignmentText
                ? JSON.parse(assignmentText)
                : [];

            const assignmentArray = Array.isArray(assignmentData)
                ? assignmentData
                : assignmentData.assignments ?? [];

            setProgress(progressData);
            setAssignments((assignmentArray as ApiAssignment[]).map(normalizeAssignment));
        } catch (err) {
            console.error("Dashboard error:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Có lỗi xảy ra khi tải Dashboard"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        queueMicrotask(() => void loadDashboard());
    }, []);

    const recentAssignments = assignments.slice(0, 4);
    const completedCount = assignments.filter(a => a.status === "SUBMITTED").length;
    const pendingCount = assignments.filter(a => a.status === "NOT_STARTED").length;

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="flex h-20 items-center justify-between px-8">
                    <div>
                        <p className="text-sm text-slate-500">
                            Student Dashboard
                        </p>

                        <h1 className="text-xl font-bold text-slate-800">
                            Tổng quan học tập
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg transition hover:bg-slate-50">
                            🔔

                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                        </button>

                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-semibold text-slate-800">
                                Student
                            </p>

                            <p className="text-xs text-slate-500">
                                Học sinh
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                            S
                        </div>
                    </div>
                </div>
            </header>

            <div className="p-8">
                {/* Error */}
                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Welcome */}
                <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-sm">
                    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                        <div>
                            <p className="mb-2 text-sm font-medium text-blue-100">
                                Chào mừng bạn quay trở lại 👋
                            </p>

                            <h2 className="text-3xl font-bold">
                                Tiếp tục hành trình học tiếng Anh
                            </h2>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
                                Hãy hoàn thành các bài tập được giao và luyện tập
                                thường xuyên để cải thiện cả 4 kỹ năng tiếng Anh.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link
                                    href="/student/assignments"
                                    className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                                >
                                    Xem bài tập
                                </Link>

                                <Link
                                    href="/student/progress"
                                    className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                                >
                                    Xem tiến độ
                                </Link>
                            </div>
                        </div>

                        <div className="hidden h-36 w-36 items-center justify-center rounded-full bg-white/10 text-7xl md:flex">
                            📚
                        </div>
                    </div>
                </section>

                {/* Statistics */}
                <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Tổng bài tập"
                        value={assignments.length}
                        icon="📝"
                        description="Bài tập được giao"
                    />

                    <StatCard
                        title="Đã hoàn thành"
                        value={completedCount}
                        icon="✅"
                        description="Bài đã nộp"
                    />

                    <StatCard
                        title="Chưa hoàn thành"
                        value={pendingCount}
                        icon="⏳"
                        description="Bài cần thực hiện"
                    />

                    <StatCard
                        title="Điểm trung bình"
                        value={
                            progress?.averageScore != null
                                ? `${progress.averageScore.toFixed(2)}/10`
                                : "--"
                        }
                        icon="⭐"
                        description="Điểm các bài đã chấm"
                    />
                </section>

                <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
  <StatCard
    title="Đang chờ chấm"
    value={progress?.awaitingGrading ?? 0}
    icon="🕒"
    description="Đã nộp nhưng chưa có điểm"
  />

  <StatCard
    title="Đã có điểm"
    value={progress?.gradedAssignments ?? 0}
    icon="🏆"
    description="Bài đã được chấm"
  />

  <StatCard
    title="Quá hạn"
    value={progress?.expiredAssignments ?? 0}
    icon="📅"
    description="Bài chưa nộp và đã hết hạn"
  />
                </section>

                {/* Main grid */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    {/* Skills */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    Tiến độ 4 kỹ năng
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Theo dõi kết quả học tập của bạn
                                </p>
                            </div>

                            <Link
                                href="/student/progress"
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                                Chi tiết →
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <SkillCard
                                skill="LISTENING"
                                score={progress?.skillProgress?.LISTENING ?? null}
                            />

                            <SkillCard
                                skill="SPEAKING"
                                score={progress?.skillProgress?.SPEAKING ?? null}
                            />

                            <SkillCard
                                skill="READING"
                                score={progress?.skillProgress?.READING ?? null}
                            />

                            <SkillCard
                                skill="WRITING"
                                score={progress?.skillProgress?.WRITING ?? null}
                            />
                        </div>
                    </section>

                    {/* Quick actions */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-800">
                            Truy cập nhanh
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Các chức năng học tập
                        </p>

                        <div className="mt-6 space-y-3">
                            <QuickAction
                                href="/student/assignments"
                                icon="📝"
                                title="Bài tập"
                                description="Xem bài tập được giao"
                            />

                            <QuickAction
                                href="/student/history"
                                icon="📚"
                                title="Lịch sử"
                                description="Xem các bài đã làm"
                            />

                            <QuickAction
                                href="/student/progress"
                                icon="📊"
                                title="Tiến độ"
                                description="Theo dõi kết quả"
                            />
                        </div>
                    </section>
                </div>

                {/* Recent assignments */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">
                                Bài tập gần đây
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Những bài tập mới nhất được giao
                            </p>
                        </div>

                        <Link
                            href="/student/assignments"
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Xem tất cả →
                        </Link>
                    </div>

                    {loading ? (
                        <div className="py-12 text-center text-sm text-slate-500">
                            Đang tải dữ liệu...
                        </div>
                    ) : recentAssignments.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 py-12 text-center">
                            <div className="text-4xl">📭</div>

                            <p className="mt-3 font-medium text-slate-700">
                                Chưa có bài tập
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Khi giáo viên giao bài, bài tập sẽ xuất hiện ở đây.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentAssignments.map((assignment) => {
                                const skill =
                                    skillConfig[assignment.exercise.skill];

                                const isCompleted =
                                    assignment.status === "SUBMITTED";

                                const isExpired =
                                    assignment.status === "EXPIRED";

                                return (
                                    <div
                                        key={assignment.id}
                                        className={`flex flex-col gap-4 rounded-xl border p-4 transition md:flex-row md:items-center md:justify-between ${isCompleted
                                            ? "border-green-200 bg-green-50/30"
                                            : isExpired
                                                ? "border-red-200 bg-red-50/30"
                                                : "border-slate-200 hover:border-blue-200 hover:bg-blue-50/30"
                                            }`}
                                    >
                                        {/* LEFT */}
                                        <div className="flex min-w-0 items-center gap-4">
                                            <div
                                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${isCompleted
                                                    ? "bg-green-100"
                                                    : isExpired
                                                        ? "bg-red-100"
                                                        : "bg-blue-50"
                                                    }`}
                                            >
                                                {isCompleted
                                                    ? "✅"
                                                    : isExpired
                                                        ? "⛔"
                                                        : skill.icon}
                                            </div>

                                            <div className="min-w-0">
                                                <h3 className="truncate font-semibold text-slate-800">
                                                    {assignment.title ||
                                                        assignment.exercise.title}
                                                </h3>

                                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                                    <span>{skill.name}</span>

                                                    <span>•</span>

                                                    <span>{assignment.class.name}</span>

                                                    <span>•</span>

                                                    <span>
                                                        {difficultyLabel[
                                                            assignment.exercise.difficulty
                                                        ]}
                                                    </span>
                                                </div>

                                                {/* STATUS */}
                                                <div className="mt-2">
                                                    {isCompleted ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                                ✓ Đã hoàn thành
                                                            </span>

                                                            {assignment.submission?.score !==
                                                                null &&
                                                                assignment.submission?.score !==
                                                                undefined && (
                                                                    <span className="text-xs font-semibold text-slate-600">
                                                                        Điểm:{" "}
                                                                        {Number(
                                                                            assignment.submission.score
                                                                        ).toFixed(1)}
                                                                        /10
                                                                    </span>
                                                                )}
                                                            {assignment.submission?.score == null && (
                                                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                                                    Đang chờ chấm
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : isExpired ? (
                                                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                                            Đã hết hạn
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                                                            Chưa làm
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">
                                                    {isCompleted
                                                        ? "Ngày nộp"
                                                        : "Hạn nộp"}
                                                </p>

                                                <p className="mt-1 text-sm font-medium text-slate-700">
                                                    {isCompleted
                                                        ? formatDate(
                                                            assignment.submission
                                                                ?.submittedAt
                                                        )
                                                        : formatDate(assignment.dueAt)}
                                                </p>
                                            </div>

                                            {/* CHƯA LÀM */}
                                            {!isCompleted && !isExpired && (
                                                <Link
                                                    href={`/student/assignments/${assignment.id}`}
                                                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                                                >
                                                    Làm bài
                                                </Link>
                                            )}

                                            {/* ĐÃ LÀM */}
                                            {isCompleted && (
                                                <Link
                                                    href={`/student/assignments/${assignment.id}?review=true`}
                                                    className="rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50"
                                                >
                                                    Xem bài đã làm
                                                </Link>
                                            )}

                                            {/* HẾT HẠN */}
                                            {isExpired && !isCompleted && (
                                                <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400">
                                                    Hết hạn
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Skills learning */}
                <section className="mt-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-bold text-slate-800">
                            Luyện tập 4 kỹ năng
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Theo dõi kết quả và tiếp tục luyện tập cả 4 kỹ năng.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        <LearningSkill
                            skill="LISTENING"
                            score={progress?.skillProgress?.LISTENING ?? null}
                        />

                        <LearningSkill
                            skill="SPEAKING"
                            score={progress?.skillProgress?.SPEAKING ?? null}
                        />

                        <LearningSkill
                            skill="READING"
                            score={progress?.skillProgress?.READING ?? null}
                        />

                        <LearningSkill
                            skill="WRITING"
                            score={progress?.skillProgress?.WRITING ?? null}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
    description,
}: {
    title: string;
    value: string | number;
    icon: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {title}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-800">
                        {value}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        {description}
                    </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function SkillCard({
    skill,
    score,
}: {
    skill: keyof typeof skillConfig;
    score: number | null;
}) {
    const config = skillConfig[skill];
    const safeScore = score == null || !Number.isFinite(score)
        ? null
        : Math.max(0, Math.min(10, score));
    const percentage = safeScore == null ? 0 : safeScore * 10;

    return (
        <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-lg">
                        {config.icon}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">{config.name}</p>
                        <p className="text-xs text-slate-500">{config.description}</p>
                    </div>
                </div>
                <span className="text-sm font-bold text-blue-600">
                    {safeScore == null ? "Chưa có điểm" : `${safeScore.toFixed(1)}/10`}
                </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function QuickAction({
    href,
    icon,
    title,
    description,
}: {
    href: string;
    icon: string;
    title: string;
    description: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50"
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg">
                {icon}
            </div>

            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                    {title}
                </p>

                <p className="truncate text-xs text-slate-500">
                    {description}
                </p>
            </div>

            <span className="ml-auto text-slate-400">
                →
            </span>
        </Link>
    );
}

function LearningSkill({
    skill,
    score,
}: {
    skill: keyof typeof skillConfig;
    score: number | null;
}) {
    const config = skillConfig[skill];
    const safeScore = score == null || !Number.isFinite(score)
        ? null
        : Math.max(0, Math.min(10, score));
    const percentage = safeScore == null ? 0 : safeScore * 10;

    return (
        <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
            <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    {config.icon}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    {safeScore == null ? "Chưa có điểm" : `${safeScore.toFixed(1)}/10`}
                </span>
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-800">{config.name}</h3>
            <p className="mt-2 text-sm leading-5 text-slate-500">{config.description}</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${percentage}%` }} />
            </div>
            <div className="mt-4 text-xs font-medium text-slate-400">
                AI Learning <span className="ml-1">→</span>
            </div>
        </div>
    );
}
