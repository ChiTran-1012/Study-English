"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Student = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
};

type Member = {
  id: string;
  joinedAt: string;
  student: Student;
};

type ClassData = {
  id: string;
  name: string;
  code: string;
  grade: number;
  description?: string | null;
  members: Member[];
};

export default function ClassDetailPage() {
  const params = useParams();

  const classId = params.id as string;

  const [classData, setClassData] = useState<ClassData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [studentEmail, setStudentEmail] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(
    null
  );

  // ================================
  // GET CLASS DETAIL
  // ================================
  useEffect(() => {
    const fetchClass = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/classes/${classId}`);

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Không thể lấy thông tin lớp.");
          return;
        }

        setClassData(data.class);
      } catch (error) {
        console.error("Fetch class error:", error);
        setError("Không thể kết nối đến server.");
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      fetchClass();
    }
  }, [classId]);

  // ================================
  // ADD STUDENT
  // ================================
  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const email = studentEmail.trim();

    if (!email) {
      alert("Vui lòng nhập email học sinh.");
      return;
    }

    try {
      setAddingStudent(true);

      const response = await fetch(`/api/classes/${classId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Không thể thêm học sinh.");
        return;
      }

      alert("Thêm học sinh thành công.");

      setStudentEmail("");

      // Reload lại dữ liệu lớp
      const classResponse = await fetch(`/api/classes/${classId}`);

      const classDataResponse = await classResponse.json();

      if (classResponse.ok) {
        setClassData(classDataResponse.class);
      }
    } catch (error) {
      console.error("Add student error:", error);
      alert("Có lỗi xảy ra khi thêm học sinh.");
    } finally {
      setAddingStudent(false);
    }
  };

  // ================================
  // REMOVE STUDENT
  // ================================
  const handleRemoveStudent = async (studentId: string) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa học sinh này khỏi lớp?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setRemovingStudentId(studentId);

      const response = await fetch(`/api/classes/${classId}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Không thể xóa học sinh.");
        return;
      }

      alert("Xóa học sinh khỏi lớp thành công.");

      // Cập nhật UI ngay, không cần reload toàn trang
      setClassData((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          members: prev.members.filter(
            (member) => member.student.id !== studentId
          ),
        };
      });
    } catch (error) {
      console.error("Remove student error:", error);
      alert("Có lỗi xảy ra khi xóa học sinh.");
    } finally {
      setRemovingStudentId(null);
    }
  };

  // ================================
  // LOADING
  // ================================
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-gray-500">Đang tải thông tin lớp...</div>
      </div>
    );
  }

  // ================================
  // ERROR
  // ================================
  if (error) {
    return (
      <div className="p-6">
        <Link
          href="/teacher/classes"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Quay lại danh sách lớp
        </Link>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-700">
            Không thể tải thông tin lớp
          </h2>

          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // ================================
  // CLASS NOT FOUND
  // ================================
  if (!classData) {
    return (
      <div className="p-6">
        <Link
          href="/teacher/classes"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Quay lại danh sách lớp
        </Link>

        <div className="mt-6 rounded-xl border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">Không tìm thấy lớp học.</p>
        </div>
      </div>
    );
  }

  // ================================
  // MAIN UI
  // ================================
  return (
    <div className="p-6">
      {/* =====================================
          BACK BUTTON
      ====================================== */}
      <Link
        href="/teacher/classes"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        ← Quay lại danh sách lớp
      </Link>

      {/* =====================================
          CLASS HEADER
      ====================================== */}
      <div className="mt-5 rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Class Details
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {classData.name}
            </h1>

            {classData.description && (
              <p className="mt-2 text-sm text-gray-500">
                {classData.description}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-blue-50 px-4 py-3">
            <p className="text-xs text-gray-500">Class Code</p>

            <p className="mt-1 text-lg font-bold tracking-wide text-blue-700">
              {classData.code}
            </p>
          </div>
        </div>

        {/* =====================================
            CLASS INFORMATION
        ====================================== */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Grade */}
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Grade</p>

            <p className="mt-1 text-xl font-semibold text-gray-900">
              {classData.grade}
            </p>
          </div>

          {/* Students */}
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Students</p>

            <p className="mt-1 text-xl font-semibold text-gray-900">
              {classData.members.length}
            </p>
          </div>

          {/* Status */}
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Status</p>

            <p className="mt-1 text-xl font-semibold text-green-600">
              Active
            </p>
          </div>
        </div>
      </div>

      {/* =====================================
          STUDENTS SECTION
      ====================================== */}
      <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Students
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Quản lý học sinh trong lớp học này.
            </p>
          </div>

          {/* =====================================
              ADD STUDENT FORM
          ====================================== */}
          <form
            onSubmit={handleAddStudent}
            className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"
          >
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="student@gmail.com"
              disabled={addingStudent}
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72 disabled:bg-gray-100"
            />

            <button
              type="submit"
              disabled={addingStudent}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingStudent ? "Adding..." : "Add Student"}
            </button>
          </form>
        </div>

        {/* =====================================
            EMPTY STATE
        ====================================== */}
        {classData.members.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <span className="text-xl">👨‍🎓</span>
            </div>

            <h3 className="mt-4 font-semibold text-gray-900">
              Lớp chưa có học sinh
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Nhập email học sinh ở phía trên để thêm học sinh vào lớp.
            </p>
          </div>
        ) : (
          /* =====================================
             STUDENTS TABLE
          ====================================== */
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-3 text-sm font-semibold text-gray-700">
                    #
                  </th>

                  <th className="p-3 text-sm font-semibold text-gray-700">
                    Name
                  </th>

                  <th className="p-3 text-sm font-semibold text-gray-700">
                    Email
                  </th>

                  <th className="p-3 text-sm font-semibold text-gray-700">
                    Joined
                  </th>

                  <th className="p-3 text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {classData.members.map((member, index) => (
                  <tr
                    key={member.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    {/* Number */}
                    <td className="p-3 text-sm text-gray-500">
                      {index + 1}
                    </td>

                    {/* Name */}
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                          {member.student.name
                            ?.charAt(0)
                            .toUpperCase() || "S"}
                        </div>

                        <span className="font-medium text-gray-900">
                          {member.student.name}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="p-3 text-sm text-gray-600">
                      {member.student.email}
                    </td>

                    {/* Joined */}
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(member.joinedAt).toLocaleDateString(
                        "vi-VN"
                      )}
                    </td>

                    {/* Action */}
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveStudent(member.student.id)
                        }
                        disabled={
                          removingStudentId === member.student.id
                        }
                        className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingStudentId === member.student.id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}