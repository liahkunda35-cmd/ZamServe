import { z } from "zod";
import { route, ok, readJson } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";
import { requestPasswordReset } from "@/application/account";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const body = z.object({ phone: z.string() }).parse(await readJson(req));
  const phone = normalizePhone(body.phone);
  const message = "If an account exists for that number, a reset code is ready.";
  if (!phone) return ok({ message });
  const code = await requestPasswordReset(phone);
  const devCode = process.env.ALLOW_DEV_RESET === "true" ? code ?? undefined : undefined;
  return ok({ message, devCode });
});
