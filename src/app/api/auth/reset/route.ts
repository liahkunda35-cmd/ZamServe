import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const body = z
    .object({
      phone: z.string(),
      code: z.string().min(4, "Enter the reset code."),
      password: z.string().min(6, "Use at least 6 characters."),
    })
    .parse(await readJson(req));
  const phone = normalizePhone(body.phone);
  if (!phone) throw new HttpError("Enter a valid Zambian phone number.", 400);
  const resets = await prisma.passwordReset.findMany({
    where: { phone, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  let match: (typeof resets)[number] | null = null;
  for (const reset of resets) {
    if (await bcrypt.compare(body.code.trim(), reset.codeHash)) {
      match = reset;
      break;
    }
  }
  if (!match) throw new HttpError("That reset code is invalid or has expired.", 400);
  await prisma.$transaction([
    prisma.user.update({ where: { phone }, data: { passwordHash: await hashPassword(body.password) } }),
    prisma.passwordReset.update({ where: { id: match.id }, data: { used: true } }),
  ]);
  return ok({ message: "Password updated. You can log in now." });
});
