"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Exercise = {
  id: string;
  title: string;
  skill: string;
  difficulty: string;
};

type ClassItem = {
  id: string;
  name: string;
  code: string;
  grade: number;
};

export default function CreateAssignmentPage() {
  const router = useRouter();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [exerciseId, setExerciseId] = useState("");
  const [classId, setClassId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [startAt, setStartAt] = useState("");
  const [dueAt, setDueAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [exerciseResponse, classResponse] =
          await Promise.all([
            fetch("/api/exercises"),
            fetch("/api/classes"),
          ]);

        const exerciseText =
          await exerciseResponse.text();

        const classText =
          await classResponse.text();

        if (!exerciseResponse.ok) {
          throw new Error(
            exerciseText ||
              "Không thể tải danh sách bài tập"
          );
        }

        if (!classResponse.ok) {
          throw new Error(
            classText ||
              "Không thể tải danh sách lớp"
          );
        }

        const exerciseData = exerciseText
  ? JSON.parse(exerciseText)
  : [];

const classData = classText
  ? JSON.parse(classText)
  : [];

console.log("Exercise API:", exerciseData);
console.log("Class API:", classData);

// Exercise API có thể trả về mảng
const exercisesArray = Array.isArray(exerciseData)
  ? exerciseData
  : exerciseData.exercises ?? [];

// Class API có thể trả về { classes: [...] }
const classesArray = Array.isArray(classData)
  ? classData
  : classData.classes ?? [];

setExercises(exercisesArray);
setClasses(classesArray);
      } catch (error) {
        console.error("LOAD DATA ERROR:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Không thể tải dữ liệu"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!exerciseId) {
      setError("Vui lòng chọn bài tập");
      return;
    }

    if (!classId) {
      setError("Vui lòng chọn lớp");
      return;
    }

    if (dueAt && startAt && dueAt <= startAt) {
      setError(
        "Hạn nộp phải sau ngày bắt đầu"
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/assignments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            exerciseId,
            classId,
            title,
            description,
            startAt: startAt
              ? new Date(startAt).toISOString()
              : null,
            dueAt: dueAt
              ? new Date(dueAt).toISOString()
              : null,
          }),
        }
      );

      const text = await response.text();

      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Không thể tạo bài giao"
        );
      }

      alert("Giao bài tập thành công!");

      router.push("/teacher/assignments");
      router.refresh();
    } catch (error) {
      console.error(
        "CREATE ASSIGNMENT ERROR:",
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

  if (loading) {
    return (
      <div className="p-6">
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Giao bài tập
        </h1>

        <p className="mt-1 text-gray-500">
          Chọn bài tập và lớp học để giao bài.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
      >
        {/* Exercise */}
        <div>
          <label className="mb-2 block font-medium">
            Bài tập
          </label>

          <select
            value={exerciseId}
            onChange={(e) =>
              setExerciseId(e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
            required
          >
            <option value="">
              -- Chọn bài tập --
            </option>

            {exercises.map((exercise) => (
              <option
                key={exercise.id}
                value={exercise.id}
              >
                {exercise.title} —{" "}
                {exercise.skill} —{" "}
                {exercise.difficulty}
              </option>
            ))}
          </select>

          {exercises.length === 0 && (
            <p className="mt-2 text-sm text-red-500">
              Bạn chưa có bài tập nào.
              Hãy tạo Exercise trước.
            </p>
          )}
        </div>

        {/* Class */}
        <div>
          <label className="mb-2 block font-medium">
            Lớp
          </label>

          <select
            value={classId}
            onChange={(e) =>
              setClassId(e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
            required
          >
            <option value="">
              -- Chọn lớp --
            </option>

            {classes.map((classItem) => (
              <option
                key={classItem.id}
                value={classItem.id}
              >
                {classItem.name} —{" "}
                {classItem.code} — Khối{" "}
                {classItem.grade}
              </option>
            ))}
          </select>

          {classes.length === 0 && (
            <p className="mt-2 text-sm text-red-500">
              Bạn chưa có lớp nào.
              Hãy tạo Class trước.
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="mb-2 block font-medium">
            Tiêu đề giao bài
          </label>

          <input
            type="text"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Ví dụ: Bài Reading tuần 1"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block font-medium">
            Mô tả
          </label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="Nhập yêu cầu cho học sinh..."
            rows={4}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Start */}
        <div>
          <label className="mb-2 block font-medium">
            Thời gian bắt đầu
          </label>

          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) =>
              setStartAt(e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Due */}
        <div>
          <label className="mb-2 block font-medium">
            Hạn nộp
          </label>

          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) =>
              setDueAt(e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              router.push("/teacher/assignments")
            }
            className="rounded-lg border px-5 py-2 hover:bg-gray-50"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={
              saving ||
              exercises.length === 0 ||
              classes.length === 0
            }
            className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Đang giao..."
              : "Giao bài tập"}
          </button>
        </div>
      </form>
    </div>
  );
}