import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret-key"
);

export async function createToken(user: {
    id: string;
    email: string;
    role: string;
}) {
    return await new SignJWT({
        id: user.id,
        email: user.email,
        role: user.role,
    })
    .setProtectedHeader({
        alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string) {
    try {
        const {payload} = await jwtVerify(token, secret);

        return payload;
    } catch {
        return null;
    }
}