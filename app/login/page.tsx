"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message);
                return;
            }

            //Chuyen trang theo role
            if (data.user.role === "TEACHER") {
                router.push("/teacher");
            } else if (data.user.role === "STUDENT") {
                router.push("/student");
            } else if (data.user.role === "ADMIN") {
                router.push("/admin");
            } else {
                setError("Vai trò tài khoản không hợp lệ");
            }
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
                    Đăng nhập
                </h1>

                <p className="text-gray-500 text-center mb-6">
                    Đăng nhập vào Study English
                </p>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block mb-2 font-medium">
                            Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập email"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                    >
                        {loading ? "Dang dang nhap..." : "Đăng nhập"}
                    </button>
                </form>

                {error && (
                    <p className="text-red-500">{error}</p>
                )}

                <p className="text-center text-gray-500 mt-6">
                    Chưa có tài khoản?{" "}
                    <a
                        href="/register"
                        className="text-blue-600 font-medium hover:underline"
                    >
                        Đăng ký
                    </a>
                </p>
            </div>
        </div>
    );
}