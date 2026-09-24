"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function CreateOptionPage() {
  const params = useParams();
  const router = useRouter();

  const exerciseId = params.id as string;
  const questionId = params.questionId as string;

  const [label, setLabel] = useState("A");
  const [content, setContent] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/questions/${questionId}/options`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            label,
            content,
            isCorrect,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể thêm đáp án"
        );
      }

      alert("Thêm đáp án thành công!");

      router.push(
        `/teacher/exercises/${exerciseId}`
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/teacher/exercises/${exerciseId}`}
          className="text-blue-600 hover:underline"
        >
          ← Quay lại bài tập
        </Link>

        <h1 className="mt-4 text-3xl font-bold">
          Thêm đáp án
        </h1>

        <p className="mt-2 text-gray-600">
          Thêm một đáp án cho câu hỏi.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-6 rounded-xl border bg-white p-6 shadow-sm"
      >
        {/* Label */}
        <div>
          <label className="mb-2 block font-semibold">
            Nhãn đáp án
          </label>

          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>

        {/* Content */}
        <div>
          <label className="mb-2 block font-semibold">
            Nội dung đáp án
          </label>

          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ví dụ: My name is John."
            required
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        {/* Correct answer */}
        <div className="flex items-center gap-3">
          <input
            id="isCorrect"
            type="checkbox"
            checked={isCorrect}
            onChange={(e) =>
              setIsCorrect(e.target.checked)
            }
            className="h-4 w-4"
          />

          <label
            htmlFor="isCorrect"
            className="font-semibold"
          >
            Đây là đáp án đúng
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Link
            href={`/teacher/exercises/${exerciseId}`}
            className="rounded-lg border px-5 py-2.5 hover:bg-gray-50"
          >
            Hủy
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang lưu..." : "Thêm đáp án"}
          </button>
        </div>
      </form>
    </div>
  );
}