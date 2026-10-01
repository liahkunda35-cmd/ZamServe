import { z } from "zod";
import { route, ok, readJson } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";
import { HttpError } from "@/lib/http";
import { registerCustomer } from "@/lib/account";
import { setSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80),
  phone: z.string().min(1, "Enter your phone number."),
  password: z.string().min(6, "Use at least 6 characters."),
  confirmPassword: z.string(),
  avatarUrl: z.string().optional().nullable(),
});

export const POST = route(async (req) => {
  const body = schema.parse(await readJson(req));
  if (body.password !== body.confirmPassword) throw new HttpError("Passwords do not match.", 400);
  const phone = normalizePhone(body.phone);
  if (!phone) throw new HttpError("Enter a valid Zambian phone number.", 400);
  const user = await registerCustomer({ ...body, phone });
  await setSession(user.id, "CUSTOMER");
  return ok({ ok: true }, 201);
});
