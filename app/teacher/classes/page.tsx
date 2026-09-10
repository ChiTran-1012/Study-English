"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ClassItem = {
  id: string;
  name: string;
  code: string;
  grade: number;
  description?: string | null;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch("/api/classes");

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Không thể lấy danh sách lớp");
          return;
        }

        setClasses(data.classes);
      } catch (error) {
        console.error(error);
        setError("Không thể kết nối đến server");
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            My Classes
          </h1>

          <p className="mt-1 text-gray-500">
            Quản lý các lớp học của bạn
          </p>
        </div>

        <Link
          href="/teacher/classes/create"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + Create Class
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-8 text-gray-500">
          Đang tải danh sách lớp...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="mt-8 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && classes.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold">
            Chưa có lớp học
          </h2>

          <p className="mt-2 text-gray-500">
            Bạn chưa tạo lớp học nào.
          </p>

          <Link
            href="/teacher/classes/create"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Tạo lớp đầu tiên
          </Link>
        </div>
      )}

      {/* Class list */}
      {!loading && !error && classes.length > 0 && (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <h2 className="text-xl font-semibold">
                {item.name}
              </h2>

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="font-medium">
                    Grade:
                  </span>{" "}
                  {item.grade}
                </p>

                <p>
                  <span className="font-medium">
                    Class code:
                  </span>{" "}
                  {item.code}
                </p>

                {item.description && (
                  <p className="text-gray-500">
                    {item.description}
                  </p>
                )}
              </div>

              <Link
                href={`/teacher/classes/${item.id}`}
                className="mt-5 block rounded-lg border px-4 py-2 text-center text-sm font-medium hover:bg-gray-50"
              >
                View Class
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}