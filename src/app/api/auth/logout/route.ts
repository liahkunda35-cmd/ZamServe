import { route, ok } from "@/lib/http";
import { clearSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = route(async () => {
  await clearSession();
  return ok({ ok: true });
});
