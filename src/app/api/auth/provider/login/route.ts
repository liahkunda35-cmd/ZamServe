import { z } from "zod";
import { route, ok, readJson } from "@/lib/http";
import { loginWithRole } from "@/lib/account";
import { setSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const body = z.object({ phone: z.string().min(1, "Enter your phone number."), password: z.string().min(1, "Enter your password.") }).parse(await readJson(req));
  const user = await loginWithRole(body.phone, body.password, "PROVIDER");
  await setSession(user.id, "PROVIDER");
  return ok({ ok: true });
});
