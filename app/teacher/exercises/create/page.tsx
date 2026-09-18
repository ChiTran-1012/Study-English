"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateExercisePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState("READING");
  const [difficulty, setDifficulty] = useState("EASY");
  const [source, setSource] = useState("MANUAL");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/exercises",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description,
            skill,
            difficulty,
            source,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể tạo bài tập"
        );
      }

      alert("Tạo bài tập thành công");

      router.push("/teacher/exercises");
    } catch (error) {
      console.error(
        "CREATE EXERCISE ERROR:",
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/teacher/exercises"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Quay lại danh sách bài tập
        </Link>

        <h1 className="mt-3 text-2xl font-bold">
          Tạo bài tập
        </h1>

        <p className="mt-1 text-gray-500">
          Tạo một bài tập mới cho học sinh
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-6 rounded-xl border bg-white p-6 shadow-sm"
      >
        {/* Title */}

        <div>
          <label className="mb-2 block font-medium">
            Tên bài tập
          </label>

          <input
            type="text"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            placeholder="Ví dụ: Reading - Unit 1"
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Description */}

        <div>
          <label className="mb-2 block font-medium">
            Mô tả
          </label>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Mô tả ngắn về bài tập..."
            rows={4}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        {/* Skill */}

        <div>
          <label className="mb-2 block font-medium">
            Kỹ năng
          </label>

          <select
            value={skill}
            onChange={(event) =>
              setSkill(event.target.value)
            }
            className="w-full rounded-lg border px-4 py-3"
          >
            <option value="READING">
              Reading
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

        {/* Difficulty */}

        <div>
          <label className="mb-2 block font-medium">
            Độ khó
          </label>

          <select
            value={difficulty}
            onChange={(event) =>
              setDifficulty(event.target.value)
            }
            className="w-full rounded-lg border px-4 py-3"
          >
            <option value="EASY">
              Easy
            </option>

            <option value="MEDIUM">
              Medium
            </option>

            <option value="HARD">
              Hard
            </option>
          </select>
        </div>

        {/* Source */}

        <div>
          <label className="mb-2 block font-medium">
            Nguồn bài tập
          </label>

          <select
            value={source}
            onChange={(event) =>
              setSource(event.target.value)
            }
            className="w-full rounded-lg border px-4 py-3"
          >
            <option value="MANUAL">
              Teacher tạo
            </option>

            <option value="AI">
              AI tạo
            </option>
          </select>
        </div>

        {/* Buttons */}

        <div className="flex justify-end gap-3 border-t pt-5">
          <Link
            href="/teacher/exercises"
            className="rounded-lg border px-5 py-2.5 hover:bg-gray-50"
          >
            Hủy
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Đang tạo..."
              : "Tạo bài tập"}
          </button>
        </div>
      </form>
    </div>
  );
}