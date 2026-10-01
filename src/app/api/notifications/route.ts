import { route, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await listNotifications(user.id));
});
