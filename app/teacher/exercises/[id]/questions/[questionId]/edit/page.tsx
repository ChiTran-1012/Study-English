"use client";

import { useEffect, useState } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

export default function EditQuestionPage() {
  const params = useParams();
  const router = useRouter();

  const exerciseId =
    params.id as string;

  const questionId =
    params.questionId as string;

  const [content, setContent] =
    useState("");

  const [type, setType] =
    useState("MULTIPLE_CHOICE");

  const [order, setOrder] =
    useState("1");

  const [explanation, setExplanation] =
    useState("");

  const [correctAnswer, setCorrectAnswer] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==================================================
  // LOAD QUESTION
  // ==================================================

  useEffect(() => {
    loadQuestion();
  }, []);

  async function loadQuestion() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/questions/${questionId}`
      );

      const text =
        await response.text();

      console.log(
        "GET QUESTION:",
        response.status,
        text
      );

      if (!response.ok) {
        const data = text
          ? JSON.parse(text)
          : {};

        throw new Error(
          data.message ||
            "Không thể tải câu hỏi"
        );
      }

      const question =
        JSON.parse(text);

      setContent(
        question.content || ""
      );

      setType(
        question.type ||
          "MULTIPLE_CHOICE"
      );

      setOrder(
        String(question.order || 1)
      );

      setExplanation(
        question.explanation || ""
      );

      setCorrectAnswer(
        question.correctAnswer || ""
      );
    } catch (error) {
      console.error(
        "LOAD QUESTION ERROR:",
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

  // ==================================================
  // VALIDATION FRONTEND
  // ==================================================

  function validateForm() {
    if (!content.trim()) {
      return "Nội dung câu hỏi không được để trống";
    }

    if (content.trim().length > 2000) {
      return "Nội dung câu hỏi không được vượt quá 2000 ký tự";
    }

    const questionOrder =
      Number(order);

    if (
      !Number.isInteger(
        questionOrder
      ) ||
      questionOrder < 1
    ) {
      return "Thứ tự câu hỏi phải là số nguyên lớn hơn hoặc bằng 1";
    }

    const allowedTypes = [
      "MULTIPLE_CHOICE",
      "TRUE_FALSE",
      "FILL_BLANK",
      "REORDER",
      "MATCHING",
      "LISTENING",
      "SPEAKING",
      "WRITING",
    ];

    if (
      !allowedTypes.includes(type)
    ) {
      return "Loại câu hỏi không hợp lệ";
    }

    return "";
  }

  // ==================================================
  // SUBMIT
  // ==================================================

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/questions/${questionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            content:
              content.trim(),

            type,

            order:
              Number(order),

            explanation:
              explanation.trim(),

            correctAnswer:
              correctAnswer.trim(),
          }),
        }
      );

      const text =
        await response.text();

      console.log(
        "UPDATE QUESTION:",
        response.status,
        text
      );

      const data = text
        ? JSON.parse(text)
        : {};

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Không thể cập nhật câu hỏi"
        );
      }

      alert(
        "Cập nhật câu hỏi thành công"
      );

      router.push(
        `/teacher/exercises/${exerciseId}`
      );
    } catch (error) {
      console.error(
        "UPDATE QUESTION ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra"
      );
    } finally {
      setSaving(false);
    }
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div className="p-6">
        Đang tải câu hỏi...
      </div>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Sửa câu hỏi
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
      >
        {/* CONTENT */}

        <div>
          <label className="mb-2 block font-medium">
            Nội dung câu hỏi
          </label>

          <textarea
            value={content}
            onChange={(e) =>
              setContent(
                e.target.value
              )
            }
            rows={5}
            maxLength={2000}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Nhập nội dung câu hỏi..."
          />

          <p className="mt-1 text-right text-xs text-gray-500">
            {content.length}/2000
          </p>
        </div>

        {/* TYPE */}

        <div>
          <label className="mb-2 block font-medium">
            Loại câu hỏi
          </label>

          <select
            value={type}
            onChange={(e) =>
              setType(
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="MULTIPLE_CHOICE">
              Multiple Choice
            </option>

            <option value="TRUE_FALSE">
              True / False
            </option>

            <option value="FILL_BLANK">
              Fill Blank
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

        {/* ORDER */}

        <div>
          <label className="mb-2 block font-medium">
            Thứ tự câu hỏi
          </label>

          <input
            type="number"
            min="1"
            value={order}
            onChange={(e) =>
              setOrder(
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* CORRECT ANSWER */}

        <div>
          <label className="mb-2 block font-medium">
            Đáp án đúng
          </label>

          <input
            value={correctAnswer}
            onChange={(e) =>
              setCorrectAnswer(
                e.target.value
              )
            }
            maxLength={1000}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Ví dụ: A"
          />

          <p className="mt-1 text-xs text-gray-500">
            Có thể để trống nếu câu hỏi sử dụng Options.
          </p>
        </div>

        {/* EXPLANATION */}

        <div>
          <label className="mb-2 block font-medium">
            Giải thích
          </label>

          <textarea
            value={explanation}
            onChange={(e) =>
              setExplanation(
                e.target.value
              )
            }
            rows={4}
            maxLength={2000}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Giải thích đáp án..."
          />
        </div>

        {/* BUTTONS */}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/teacher/exercises/${exerciseId}`
              )
            }
            className="rounded-lg border px-4 py-2 hover:bg-gray-50"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Đang lưu..."
              : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}