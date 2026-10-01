import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { TOKEN_COOKIE, signToken, verifyToken, type Session } from "./token";
import { HttpError } from "./http";

export async function setSession(userId: string, role: Session["role"]) {
  const token = await signToken(userId, role);
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSession() {
  const jar = await cookies();
  return verifyToken(jar.get(TOKEN_COOKIE)?.value);
}

export async function requireUser(role?: Session["role"]) {
  const session = await getSession();
  if (!session) throw new HttpError("Please log in to continue.", 401);
  if (role && session.role !== role) throw new HttpError("You do not have access to this.", 403);
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { customerProfile: true, providerProfile: true },
  });
  if (!user) throw new HttpError("Please log in to continue.", 401);
  return user;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function checkPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function unreadCounts(userId: string, role: string, profileId: string | undefined) {
  const [unreadNotifications, unreadMessages] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null } }),
    profileId
      ? prisma.message.count({
          where: {
            readAt: null,
            senderId: { not: userId },
            booking: role === "CUSTOMER" ? { customerId: profileId } : { providerId: profileId },
          },
        })
      : Promise.resolve(0),
  ]);
  return { unreadNotifications, unreadMessages };
}
