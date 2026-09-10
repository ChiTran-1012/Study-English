"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateClassPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [grade, setGrade] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          code,
          grade,
          description,
        }),
      });

      const data = await response.json();

console.log("STATUS:", response.status);
console.log("RESPONSE:", data);

if (!response.ok) {
  setError(
    data.message || `Tạo lớp thất bại (${response.status})`
  );
  return;
}

      router.push("/teacher/classes");
      router.refresh();
    } catch (error) {
      console.error(error);
      setError("Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/teacher/classes"
          className="text-sm text-blue-600"
        >
          ← Back to Classes
        </Link>

        <h1 className="mt-3 text-2xl font-bold">
          Create New Class
        </h1>

        <p className="mt-1 text-gray-500">
          Tạo một lớp học mới
        </p>
      </div>

      <div className="max-w-xl rounded-xl border bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* Class name */}
          <div>
            <label className="mb-2 block font-medium">
              Class Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="English 6A"
              className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Grade */}
          <div>
            <label className="mb-2 block font-medium">
              Grade
            </label>

            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-lg border px-4 py-2"
              required
            >
              <option value="">
                Select grade
              </option>

              {Array.from({ length: 9 }, (_, index) => (
                <option
                  key={index + 1}
                  value={index + 1}
                >
                  Grade {index + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Code */}
          <div>
            <label className="mb-2 block font-medium">
              Class Code
            </label>

            <input
              type="text"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase())
              }
              placeholder="6A-ENG"
              className="w-full rounded-lg border px-4 py-2 uppercase outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

            <p className="mt-1 text-sm text-gray-500">
              Học sinh sẽ sử dụng mã này để tham gia lớp.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block font-medium">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Mô tả lớp học..."
              rows={4}
              className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Class"}
          </button>
        </form>
      </div>
    </div>
  );
}