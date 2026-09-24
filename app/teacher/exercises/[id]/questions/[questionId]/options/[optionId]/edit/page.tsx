"use client";

import { useEffect, useState } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

export default function EditOptionPage() {
  const params = useParams();
  const router = useRouter();

  const exerciseId =
    params.id as string;

  const questionId =
    params.questionId as string;

  const optionId =
    params.optionId as string;

  const [label, setLabel] =
    useState("A");

  const [content, setContent] =
    useState("");

  const [isCorrect, setIsCorrect] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==================================================
  // LOAD OPTION
  // ==================================================

  useEffect(() => {
    loadOption();
  }, []);

  async function loadOption() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/questions/${questionId}/options`
      );

      const text =
        await response.text();

      console.log(
        "GET OPTIONS:",
        response.status,
        text
      );

      if (!response.ok) {
        const data = text
          ? JSON.parse(text)
          : {};

        throw new Error(
          data.message ||
            "Không thể tải đáp án"
        );
      }

      const options =
        text
          ? JSON.parse(text)
          : [];

      const option =
        options.find(
          (item: any) =>
            item.id === optionId
        );

      if (!option) {
        throw new Error(
          "Không tìm thấy đáp án"
        );
      }

      setLabel(
        option.label || "A"
      );

      setContent(
        option.content || ""
      );

      setIsCorrect(
        Boolean(option.isCorrect)
      );
    } catch (error) {
      console.error(
        "LOAD OPTION ERROR:",
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
    const allowedLabels = [
      "A",
      "B",
      "C",
      "D",
    ];

    if (
      !allowedLabels.includes(label)
    ) {
      return "Đáp án chỉ được phép là A, B, C hoặc D";
    }

    if (!content.trim()) {
      return "Nội dung đáp án không được để trống";
    }

    if (content.trim().length > 1000) {
      return "Nội dung đáp án không được vượt quá 1000 ký tự";
    }

    return "";
  }

  // ==================================================
  // UPDATE
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
        `/api/questions/${questionId}/options`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            optionId,

            label,

            content:
              content.trim(),

            isCorrect,
          }),
        }
      );

      const text =
        await response.text();

      console.log(
        "UPDATE OPTION:",
        response.status,
        text
      );

      const data = text
        ? JSON.parse(text)
        : {};

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Không thể cập nhật đáp án"
        );
      }

      alert(
        "Cập nhật đáp án thành công"
      );

      router.push(
        `/teacher/exercises/${exerciseId}`
      );
    } catch (error) {
      console.error(
        "UPDATE OPTION ERROR:",
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
        Đang tải đáp án...
      </div>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Sửa đáp án
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
        {/* LABEL */}

        <div>
          <label className="mb-2 block font-medium">
            Nhãn đáp án
          </label>

          <select
            value={label}
            onChange={(e) =>
              setLabel(
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="A">
              A
            </option>

            <option value="B">
              B
            </option>

            <option value="C">
              C
            </option>

            <option value="D">
              D
            </option>
          </select>
        </div>

        {/* CONTENT */}

        <div>
          <label className="mb-2 block font-medium">
            Nội dung đáp án
          </label>

          <textarea
            value={content}
            onChange={(e) =>
              setContent(
                e.target.value
              )
            }
            rows={5}
            maxLength={1000}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Nhập nội dung đáp án..."
          />

          <p className="mt-1 text-right text-xs text-gray-500">
            {content.length}/1000
          </p>
        </div>

        {/* CORRECT */}

        <div className="rounded-lg border p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={isCorrect}
              onChange={(e) =>
                setIsCorrect(
                  e.target.checked
                )
              }
              className="h-4 w-4"
            />

            <span className="font-medium">
              Đây là đáp án đúng
            </span>
          </label>

          <p className="mt-2 text-sm text-gray-500">
            Nếu chọn đáp án này là đúng,
            hệ thống sẽ tự chuyển các
            đáp án khác thành sai.
          </p>
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