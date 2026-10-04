import { route, ok } from "@/lib/http";
import { clearSession, requireUser } from "@/lib/auth";
import { deactivateAccount } from "@/lib/account";

export const dynamic = "force-dynamic";

export const POST = route(async () => {
  const user = await requireUser();
  await deactivateAccount(user.id);
  await clearSession();
  return ok({ message: "Your account has been deactivated." });
});
