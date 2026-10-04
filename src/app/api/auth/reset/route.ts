import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";
import { resetPasswordWithCode } from "@/application/account";

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
  await resetPasswordWithCode(phone, body.code, body.password);
  return ok({ message: "Password updated. You can log in now." });
});
