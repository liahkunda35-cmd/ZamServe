import { z } from "zod";
import { route, ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { markNotifications } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = z.object({ id: z.string().optional() }).parse(await readJson(req));
  await markNotifications(user.id, body.id);
  return ok({ ok: true });
});
