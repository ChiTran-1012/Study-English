import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  const pathname = request.nextUrl.pathname;

  if (!token) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    const role = payload.role;

    if (
      pathname.startsWith("/teacher") &&
      role !== "TEACHER"
    ) {
      return NextResponse.redirect(
        new URL("/student", request.url)
      );
    }

    if (
      pathname.startsWith("/student") &&
      role !== "STUDENT"
    ) {
      return NextResponse.redirect(
        new URL("/teacher", request.url)
      );
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }
}

export const config = {
  matcher: [
    "/teacher/:path*",
    "/student/:path*",
  ],
};