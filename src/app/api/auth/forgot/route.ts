import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, ok, readJson } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const body = z.object({ phone: z.string() }).parse(await readJson(req));
  const phone = normalizePhone(body.phone);
  const message = "If an account exists for that number, a reset code is ready.";
  if (!phone) return ok({ message });
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return ok({ message });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.passwordReset.create({
    data: {
      phone,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const devCode = process.env.ALLOW_DEV_RESET === "true" ? code : undefined;
  return ok({ message, devCode });
});
