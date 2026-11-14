
"use client";

import { useEffect, useState } from "react";

type Unit = {
  id: string;
  title?: string;
  name?: string;
  unitNumber?: number;
  number?: number;
};

type Lesson = {
  id: string;
  title: string;
};

type Props = {
  fileId: string;
  textbookId: string;
  grade: number;
};

export default function AssignPages({
  fileId,
  textbookId,
  grade,
}: Props) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [unitId, setUnitId] = useState("");
  const [lessonId, setLessonId] = useState("");

  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUnits() {
      const response = await fetch(
        `/api/curriculum/units?textbookId=${textbookId}&grade=${grade}`
      );

      const data = await response.json();

      console.log("UNIT API:", data);
      console.log("TEXTBOOK ID:", textbookId);
      console.log("GRADE:", grade);

      setUnits(data.units || []);
    }

    loadUnits().catch(console.error);
  }, [textbookId, grade]);

  useEffect(() => {
    if (!unitId) return;

    async function loadLessons() {
      const response = await fetch(
        `/api/curriculum/lessons?unitId=${unitId}`
      );

      const data = await response.json();
      setLessons(data.lessons || []);
    }

    loadLessons().catch(console.error);
  }, [unitId]);

  async function handleAssign() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/textbooks/files/${fileId}/assign-pages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unitId,
            lessonId: lessonId || null,
            fromPage,
            toPage,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Phân loại thất bại");
      }

      setMessage(
        `Đã phân loại ${data.updatedPages} trang thành công`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Có lỗi xảy ra"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">Phân loại Unit / Lesson</h3>

      <select
        value={unitId}
        onChange={(e) => {
          setUnitId(e.target.value);
          setLessonId("");
          setLessons([]);
        }}
        className="w-full rounded border p-2"
      >
        <option value="">Chọn Unit</option>

        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.unitNumber ?? unit.number
              ? `Unit ${unit.unitNumber ?? unit.number} - `
              : ""}
            {unit.title || unit.name || "Chưa có tên Unit"}
          </option>
        ))}
      </select>

      <select
        value={lessonId}
        onChange={(e) => setLessonId(e.target.value)}
        className="w-full rounded border p-2"
      >
        <option value="">Chọn Lesson (không bắt buộc)</option>

        {lessons.map((lesson) => (
          <option key={lesson.id} value={lesson.id}>
            {lesson.title}
          </option>
        ))}
      </select>

      <div className="flex gap-3">
        <label className="flex-1 text-sm">
          Từ trang
          <input
            type="number"
            min={1}
            value={fromPage}
            onChange={(e) => setFromPage(Number(e.target.value))}
            className="mt-1 w-full rounded border p-2"
          />
        </label>

        <label className="flex-1 text-sm">
          Đến trang
          <input
            type="number"
            min={1}
            value={toPage}
            onChange={(e) => setToPage(Number(e.target.value))}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleAssign}
        disabled={loading || !unitId}
        className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Đang lưu..." : "Lưu phân loại"}
      </button>

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
