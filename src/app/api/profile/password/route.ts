import { z } from "zod";
import { route, ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { changePassword } from "@/lib/account";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = z
    .object({
      currentPassword: z.string().min(1, "Enter your current password."),
      newPassword: z.string().min(6, "Use at least 6 characters."),
    })
    .parse(await readJson(req));
  await changePassword(user.id, body.currentPassword, body.newPassword);
  return ok({ message: "Password updated." });
});
