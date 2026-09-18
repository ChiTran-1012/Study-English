"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Exercise = {
  id: string;
  title: string;
  description: string | null;
  skill: string;
  difficulty: string;
  source: string;
  createdAt: string;
  questions: {
    id: string;
  }[];
};

export default function TeacherExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/exercises");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể lấy danh sách bài tập"
        );
      }

      setExercises(data.exercises || []);
    } catch (error) {
      console.error("LOAD EXERCISES ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa bài tập này?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/exercises/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể xóa bài tập"
        );
      }

      setExercises((prev) =>
        prev.filter((exercise) => exercise.id !== id)
      );

      alert("Xóa bài tập thành công");
    } catch (error) {
      console.error("DELETE EXERCISE ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra"
      );
    }
  }

  function getSkillName(skill: string) {
    switch (skill) {
      case "READING":
        return "Reading";

      case "LISTENING":
        return "Listening";

      case "SPEAKING":
        return "Speaking";

      case "WRITING":
        return "Writing";

      default:
        return skill;
    }
  }

  function getDifficultyName(difficulty: string) {
    switch (difficulty) {
      case "EASY":
        return "Easy";

      case "MEDIUM":
        return "Medium";

      case "HARD":
        return "Hard";

      default:
        return difficulty;
    }
  }

  function getSourceName(source: string) {
    return source === "AI" ? "AI" : "Manual";
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>Đang tải danh sách bài tập...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Bài tập
          </h1>

          <p className="mt-1 text-gray-500">
            Quản lý các bài tập của bạn
          </p>
        </div>

        <Link
          href="/teacher/exercises/create"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + Tạo bài tập
        </Link>
      </div>

      {/* Error */}

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Empty */}

      {!error && exercises.length === 0 && (
        <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold">
            Chưa có bài tập
          </h2>

          <p className="mt-2 text-gray-500">
            Hãy tạo bài tập đầu tiên của bạn.
          </p>

          <Link
            href="/teacher/exercises/create"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Tạo bài tập
          </Link>
        </div>
      )}

      {/* Exercise list */}

      {exercises.length > 0 && (
        <div className="space-y-4">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {exercise.title}
                  </h2>

                  {exercise.description && (
                    <p className="mt-1 text-sm text-gray-500">
                      {exercise.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                      {getSkillName(exercise.skill)}
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                      {getDifficultyName(
                        exercise.difficulty
                      )}
                    </span>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                      {getSourceName(exercise.source)}
                    </span>

                    <span className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700">
                      {exercise.questions.length} câu
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/teacher/exercises/${exercise.id}`}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Xem
                  </Link>

                  <button
                    onClick={() =>
                      handleDelete(exercise.id)
                    }
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}