import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret-key"
);

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                {
                    message: "Vui long nhap email va password",
                },
                {
                    status: 400,
                }
            );
        }

        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            return NextResponse.json(
                {
                    message: "Email hoac password khong dung",
                },
                {
                    status: 401,
                }
            );
        }

        // Kiểm tra password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return NextResponse.json(
                {
                    message: "Email hoac password khong dung",
                },
                {
                    status: 401,
                }
            );
        }

        // Tạo JWT
        const token = await new SignJWT({
            userId: user.id,
            email: user.email,
            role: user.role,
        })
            .setProtectedHeader({
                alg: "HS256",
            })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(secret);

        // Tạo response
        const response = NextResponse.json({
            message: "Dang nhap thanh cong",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

        // Lưu JWT vào cookie
        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });

        return response;

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                message: "Co loi xay ra",
            },
            {
                status: 500,
            }
        );
    }
}