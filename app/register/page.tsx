"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("STUDENT");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    role,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message);
                return;
            }

            alert("dang ky thanh cong!");

            router.push("/login");
        } catch (error) {
            console.error(error);

            setError("Khong the ket noi den sever");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
                <h1 className="text-3xl font-bold text-center mb-2">
                    Đăng ký
                </h1>

                <p className="text-gray-500 text-center mb-6">
                    Tạo tài khoản Study English
                </p>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block mb-2 font-medium">
                            Họ và tên
                        </label>

                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nhập họ tên"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">
                            Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập email"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">
                            Mật khẩu
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">
                            Vai trò
                        </label>

                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3"
                        >
                            <option value="STUDENT">Học sinh</option>
                            <option value="TEACHER">Giáo viên</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                    >
                       {loading ? "Dang dang ky..." : " Đăng ký"}
                    </button>
                </form>

                <p className="text-center text-gray-500 mt-6">
                    Đã có tài khoản?{" "}
                    <button
                        onClick={() => router.push("/login")}
                        className="text-blue-600 font-medium hover:underline"
                    >
                        Đăng nhập
                    </button>
                </p>
            </div>
        </div>
    );
}