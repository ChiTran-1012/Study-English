"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function CreateQuestionPage() {
  const params = useParams();
  const router = useRouter();

  const exerciseId = params.id as string;

  const [content, setContent] = useState("");
  const [type, setType] = useState("MULTIPLE_CHOICE");
  const [order, setOrder] = useState(1);
  const [explanation, setExplanation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/exercises/${exerciseId}/questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            type,
            order,
            explanation,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể tạo câu hỏi"
        );
      }

      alert("Thêm câu hỏi thành công!");

      router.push(`/teacher/exercises/${exerciseId}`);
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
          Thêm câu hỏi
        </h1>

        <p className="mt-2 text-gray-600">
          Tạo một câu hỏi mới cho bài tập.
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
        className="max-w-3xl space-y-6 rounded-xl border bg-white p-6 shadow-sm"
      >
        {/* Content */}
        <div>
          <label className="mb-2 block font-semibold">
            Nội dung câu hỏi
          </label>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ví dụ: What is your name?"
            rows={4}
            required
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        {/* Type */}
        <div>
          <label className="mb-2 block font-semibold">
            Loại câu hỏi
          </label>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="MULTIPLE_CHOICE">
              Multiple Choice
            </option>

            <option value="TRUE_FALSE">
              True / False
            </option>

            <option value="FILL_BLANK">
              Fill in the Blank
            </option>

            <option value="REORDER">
              Reorder
            </option>

            <option value="MATCHING">
              Matching
            </option>

            <option value="LISTENING">
              Listening
            </option>

            <option value="SPEAKING">
              Speaking
            </option>

            <option value="WRITING">
              Writing
            </option>
          </select>
        </div>

        {/* Order */}
        <div>
          <label className="mb-2 block font-semibold">
            Thứ tự câu hỏi
          </label>

          <input
            type="number"
            min={1}
            value={order}
            onChange={(e) =>
              setOrder(Number(e.target.value))
            }
            required
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        {/* Explanation */}
        <div>
          <label className="mb-2 block font-semibold">
            Giải thích đáp án
          </label>

          <textarea
            value={explanation}
            onChange={(e) =>
              setExplanation(e.target.value)
            }
            placeholder="Ví dụ: Câu hỏi sử dụng cấu trúc hỏi tên..."
            rows={4}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
          />
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
            {loading ? "Đang lưu..." : "Thêm câu hỏi"}
          </button>
        </div>
      </form>
    </div>
  );
}