import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { openai } from "@/app/lib/open-ai";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Chưa đăng nhập." },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, secret);
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
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: "Say hello in Vietnamese in one short sentence.",
    });

    return NextResponse.json({
      success: true,
      message: response.output_text,
    });
  } catch (error) {
    console.error("OPENAI TEST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Không thể kết nối OpenAI.",
      },
      { status: 502 }
    );
  }
}
