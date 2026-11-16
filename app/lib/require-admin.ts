import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { verifyToken } from "@/app/lib/auth";

export async function requireAdmin() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/login");

  const payload = await verifyToken(token);
  if (typeof payload?.id !== "string") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    redirect(user.role === "TEACHER" ? "/teacher" : "/student");
  }

  return user;
}
