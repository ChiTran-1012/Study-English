import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const body: unknown = await request.json();
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json(
                { message: "Dữ liệu đăng ký không hợp lệ." },
                { status: 400 }
            );
        }

        const input = body as Record<string, unknown>;
        const name = typeof input.name === "string" ? input.name.trim() : "";
        const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
        const password = typeof input.password === "string" ? input.password : "";
        const role = input.role;

        if (!name || !email || !password || typeof role !== "string") {
            return NextResponse.json(
                { message: "Vui lòng nhập đầy đủ thông tin." },
                { status: 400 }
            );
        }

        if (!email.includes("@") || email.length > 254 || name.length > 100) {
            return NextResponse.json(
                { message: "Tên hoặc email không hợp lệ." },
                { status: 400 }
            );
        }

        if (password.length < 8 || password.length > 128) {
            return NextResponse.json(
                { message: "Mật khẩu phải có từ 8 đến 128 ký tự." },
                { status: 400 }
            );
        }

        if (role !== Role.STUDENT && role !== Role.TEACHER) {
            return NextResponse.json(
                { message: "Không thể đăng ký vai trò quản trị viên." },
                { status: 403 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (existingUser) {
            return NextResponse.json(
                {
                    message: 'Email da dc su dung',
                },
                {
                    status: 409,
                }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role as Role,
            },
        });

        return NextResponse.json(
            {
                message: ' DAng ky thanh cong',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                message: 'Co loi xay ra',
            },
            {
                status: 500,
            }
        )
    }

    
}
