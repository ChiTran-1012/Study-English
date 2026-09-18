"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Option = {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
};

type Question = {
  id: string;
  content: string;
  type: string;
  order: number;
  explanation?: string | null;
  correctAnswer?: string | null;
  options: Option[];
};

type Exercise = {
  id: string;
  title: string;
  description?: string | null;
  skill: string;
  difficulty: string;
  source: string;
  questions: Question[];
};

export default function ExerciseDetailPage() {
  const params = useParams();

  const id = params.id as string;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchExercise = async () => {
      try {
        const response = await fetch(`/api/exercises/${id}`);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Không thể lấy bài tập"
          );
        }

        setExercise(data);
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

    if (id) {
      fetchExercise();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        Đang tải bài tập...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">
          {error}
        </p>

        <Link
          href="/teacher/exercises"
          className="mt-4 inline-block"
        >
          ← Quay lại
        </Link>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="p-6">
        Không tìm thấy bài tập.
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/teacher/exercises"
          className="text-blue-600 hover:underline"
        >
          ← Quay lại danh sách
        </Link>

        <h1 className="mt-4 text-3xl font-bold">
          {exercise.title}
        </h1>

        {exercise.description && (
          <p className="mt-2 text-gray-600">
            {exercise.description}
          </p>
        )}
      </div>

      {/* Thông tin bài tập */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">
            Kỹ năng
          </p>

          <p className="mt-1 font-semibold">
            {exercise.skill}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">
            Độ khó
          </p>

          <p className="mt-1 font-semibold">
            {exercise.difficulty}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">
            Nguồn
          </p>

          <p className="mt-1 font-semibold">
            {exercise.source}
          </p>
        </div>
      </div>

      {/* Questions */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Câu hỏi ({exercise.questions?.length ?? 0})
        </h2>

        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          onClick={() => {
            alert("Chúng ta sẽ làm chức năng thêm câu hỏi tiếp theo.");
          }}
        >
          + Thêm câu hỏi
        </button>
      </div>

      {(exercise.questions?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
          Chưa có câu hỏi nào.
        </div>
      ) : (
        <div className="space-y-6">
          {exercise.questions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-lg border p-5 shadow-sm"
            >
              <div className="mb-4">
                <p className="font-semibold">
                  Câu {index + 1}
                </p>

                <p className="mt-2 text-lg">
                  {question.content}
                </p>
              </div>

              {/* Options */}
              {question.options.length > 0 && (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <div
                      key={option.id}
                      className={`rounded-md border p-3 ${
                        option.isCorrect
                          ? "border-green-500 bg-green-50"
                          : ""
                      }`}
                    >
                      <span className="font-semibold">
                        {option.label}.
                      </span>{" "}
                      {option.content}

                      {option.isCorrect && (
                        <span className="ml-2 text-sm font-semibold text-green-600">
                          ✓ Đáp án đúng
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {question.explanation && (
                <div className="mt-4 rounded-md bg-gray-50 p-3">
                  <span className="font-semibold">
                    Giải thích:
                  </span>{" "}
                  {question.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}