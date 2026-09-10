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

  const [classData, setClassData] =
    useState<ClassData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  const handleRemoveStudent = async (
  studentId: string
) => {
  const confirmed = confirm(
    "Bạn có chắc muốn xóa học sinh này khỏi lớp?"
  );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `/api/classes/${classId}/members`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert("Xóa học sinh thành công");

    window.location.reload();
  } catch (error) {
    console.error(error);
  }
};

  const handleAddStudent = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `/api/classes/${classId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: studentEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      alert("Thêm học sinh thành công");

      setStudentEmail("");

      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const response = await fetch(
          `/api/classes/${classId}`
        );

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.message ||
            "Không thể lấy thông tin lớp"
          );
          return;
        }

        setClassData(data.class);
      } catch (error) {
        console.error(error);
        setError("Không thể kết nối đến server");
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      fetchClass();
    }
  }, [classId]);

  if (loading) {
    return (
      <div className="p-6">
        Đang tải...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="p-6">
        Không tìm thấy lớp.
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back */}
      <Link
        href="/teacher/classes"
        className="text-sm text-blue-600"
      >
        ← Back to Classes
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">
          {classData.name}
        </h1>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">
              Grade
            </p>

            <p className="font-semibold">
              {classData.grade}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Class Code
            </p>

            <p className="font-semibold">
              {classData.code}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Students
            </p>

            <p className="font-semibold">
              {classData.members.length}
            </p>
          </div>
        </div>

        {classData.description && (
          <p className="mt-4 text-gray-500">
            {classData.description}
          </p>
        )}
      </div>

      {/* Students */}
      <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            Students
          </h2>

          <form
            onSubmit={handleAddStudent}
            className="mt-5 flex gap-3"
          >
            <input
              type="email"
              value={studentEmail}
              onChange={(e) =>
                setStudentEmail(e.target.value)
              }
              placeholder="student@gmail.com"
              className="flex-1 rounded-lg border px-4 py-2"
            />

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white"
            >
              Add Student
            </button>
          </form>
        </div>

        {classData.members.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
            <p className="text-gray-500">
              Lớp chưa có học sinh.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">
                    Name
                  </th>

                  <th className="p-3">
                    Email
                  </th>

                  <th className="p-3">
                    Joined
                  </th>

                  <th className="p-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {classData.members.map(
                  (member) => (
                    <tr
                      key={member.id}
                      className="border-b"
                    >
                      <td className="p-3 font-medium">
                        {member.student.name}
                      </td>

                      <td className="p-3">
                        {member.student.email}
                      </td>

                      <td className="p-3">
                        {new Date(
                          member.joinedAt
                        ).toLocaleDateString()}
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() =>
                            handleRemoveStudent(member.student.id)
                          }
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}