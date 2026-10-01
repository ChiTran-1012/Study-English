"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Option = {
    id: string;
    label: string;
    content: string;
};

type Question = {
    id: string;
    content: string;
    type: string;
    order: number;
    options: Option[];
};

type Assignment = {
    id: string;
    title: string | null;
    description: string | null;
    startAt: string;
    dueAt: string | null;

    exercise: {
        id: string;
        title: string;
        description: string | null;
        skill: string;
        difficulty: string;
        questions: Question[];
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

export default function StudentAssignmentDetailPage() {
    const params = useParams();
    const router = useRouter();

    const assignmentId = params.id as string;

    const [assignment, setAssignment] =
        useState<Assignment | null>(null);

    const [answers, setAnswers] = useState<
        Record<string, string>
    >({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadAssignment() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `/api/student/assignments/${assignmentId}`
                );

                const text = await response.text();

                console.log(
                    "GET student assignment:",
                    response.status
                );

                console.log("Response:", text);

                if (!response.ok) {
                    let message = "Không thể tải bài tập";

                    try {
                        const data = text
                            ? JSON.parse(text)
                            : {};

                        message = data.message || message;
                    } catch {
                        // Không làm gì
                    }

                    throw new Error(message);
                }

                const data = text
                    ? JSON.parse(text)
                    : null;

                setAssignment(data);
            } catch (error) {
                console.error(
                    "LOAD ASSIGNMENT ERROR:",
                    error
                );

                setError(
                    error instanceof Error
                        ? error.message
                        : "Có lỗi xảy ra"
                );
            } finally {
                setLoading(false);
            }
        }

        if (assignmentId) {
            loadAssignment();
        }
    }, [assignmentId]);

    function handleAnswer(
        questionId: string,
        optionId: string
    ) {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: optionId,
        }));
    }

    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{
        score: number;
        correctCount: number;
        totalQuestions: number;
    } | null>(null);

    const handleSubmit = async () => {
        if (submitting) return;

        try {
            setSubmitting(true);

            const response = await fetch(
                `/api/student/assignments/${assignmentId}/submit`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        answers,
                    }),
                }
            );

            const text = await response.text();

            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.message || "Nộp bài thất bại");
            }

            setResult({
                score: data.score,
                correctCount: data.correctCount,
                totalQuestions: data.totalQuestions,
            });

            alert("Nộp bài thành công!");
        } catch (error) {
            console.error(error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Có lỗi xảy ra khi nộp bài"
            );
        } finally {
            setSubmitting(false);
        }
    };

    function formatDate(date: string | null) {
        if (!date) return "Không có";

        return new Date(date).toLocaleString(
            "vi-VN"
        );
    }

    if (loading) {
        return (
            <div className="p-6">
                <p>Đang tải bài tập...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
                    {error}
                </div>

                <button
                    onClick={() =>
                        router.push("/student/assignments")
                    }
                    className="mt-4 rounded-lg border px-4 py-2"
                >
                    Quay lại
                </button>
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="p-6">
                Không tìm thấy bài tập.
            </div>
        );
    }

    const questions =
        assignment.exercise.questions ?? [];

    return (
        <div className="mx-auto max-w-4xl p-6">
            {/* Header */}
            <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
                <button
                    onClick={() =>
                        router.push("/student/assignments")
                    }
                    className="mb-4 text-sm text-blue-600 hover:underline"
                >
                    ← Quay lại danh sách bài tập
                </button>

                <h1 className="text-2xl font-bold">
                    {assignment.title ||
                        assignment.exercise.title}
                </h1>

                {assignment.description && (
                    <p className="mt-2 text-gray-600">
                        {assignment.description}
                    </p>
                )}

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-sm text-gray-500">
                            Bài tập
                        </p>

                        <p className="font-medium">
                            {assignment.exercise.title}
                        </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-sm text-gray-500">
                            Kỹ năng
                        </p>

                        <p className="font-medium">
                            {assignment.exercise.skill}
                        </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-sm text-gray-500">
                            Lớp
                        </p>

                        <p className="font-medium">
                            {assignment.class.name}
                        </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-sm text-gray-500">
                            Hạn nộp
                        </p>

                        <p className="font-medium">
                            {formatDate(assignment.dueAt)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-5">
                {questions.length === 0 ? (
                    <div className="rounded-xl border bg-white p-6 text-center">
                        <p className="text-gray-500">
                            Bài tập này chưa có câu hỏi.
                        </p>
                    </div>
                ) : (
                    questions.map((question, index) => (
                        <div
                            key={question.id}
                            className="rounded-xl border bg-white p-6 shadow-sm"
                        >
                            {/* Question */}
                            <div className="mb-5">
                                <p className="font-semibold">
                                    Câu {index + 1}
                                </p>

                                <p className="mt-2 text-lg">
                                    {question.content}
                                </p>
                            </div>

                            {/* Options */}
                            {question.options.length > 0 ? (
                                <div className="space-y-3">
                                    {question.options.map(
                                        (option) => {
                                            const selected =
                                                answers[question.id] ===
                                                option.id;

                                            return (
                                                <label
                                                    key={option.id}
                                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${selected
                                                        ? "border-blue-500 bg-blue-50"
                                                        : "hover:bg-gray-50"
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question-${question.id}`}
                                                        value={option.id}
                                                        checked={selected}
                                                        onChange={() =>
                                                            handleAnswer(
                                                                question.id,
                                                                option.id
                                                            )
                                                        }
                                                    />

                                                    <span className="font-medium">
                                                        {option.label}.
                                                    </span>

                                                    <span>
                                                        {option.content}
                                                    </span>
                                                </label>
                                            );
                                        }
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-lg bg-gray-50 p-4 text-gray-500">
                                    Câu hỏi này chưa có đáp án lựa chọn.
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Submit */}
            {questions.length > 0 && (
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
                    >
                        {submitting ? "Đang nộp..." : "Nộp bài"}
                    </button>
                </div>
            )}
            {result && (
                <div className="mt-6 rounded-xl border bg-white p-6 shadow">
                    <h2 className="text-xl font-bold">
                        Kết quả bài tập
                    </h2>

                    <div className="mt-4 space-y-2">
                        <p>
                            <strong>Điểm:</strong>{" "}
                            {result.score}/10
                        </p>

                        <p>
                            <strong>Số câu đúng:</strong>{" "}
                            {result.correctCount}/{result.totalQuestions}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
} 