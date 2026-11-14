
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    return NextResponse.json(
      { success: false, error: "Chưa đăng nhập." },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    if (payload.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Phiên đăng nhập không hợp lệ." },
      { status: 401 }
    );
  }

  try {
    const files = await prisma.textbookFile.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        displayName: true,
        originalName: true,
        grade: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        textbook: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error("GET TEXTBOOK FILES ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Không thể tải danh sách PDF." },
      { status: 500 }
    );
  }
}
