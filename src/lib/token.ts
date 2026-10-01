import { SignJWT, jwtVerify } from "jose";

export const TOKEN_COOKIE = "zam_token";

export type Session = { userId: string; role: "CUSTOMER" | "PROVIDER" };

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) return null;
  return new TextEncoder().encode(value);
}

export async function signToken(userId: string, role: Session["role"]) {
  const key = secret();
  if (!key) throw new Error("JWT_SECRET is not set");
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(key);
}

export async function verifyToken(token: string | undefined | null): Promise<Session | null> {
  const key = secret();
  if (!key || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== "CUSTOMER" && payload.role !== "PROVIDER") return null;
    if (!payload.sub) return null;
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
