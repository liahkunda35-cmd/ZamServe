import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { createPayment, listPayments } from "@/lib/account";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser("CUSTOMER");
  if (!user.customerProfile) throw new HttpError("You do not have access to this.", 403);
  return ok(await listPayments(user.customerProfile.id));
});

export const POST = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  if (!user.customerProfile) throw new HttpError("You do not have access to this.", 403);
  const body = z
    .object({
      provider: z.enum(["Airtel Money", "MoMo", "Visa"]),
      phone: z.string(),
      label: z.string().max(40).optional(),
    })
    .parse(await readJson(req));
  return ok(await createPayment(user.customerProfile.id, body), 201);
});
