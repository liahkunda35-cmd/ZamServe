import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { createAddress, listAddresses } from "@/lib/account";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser("CUSTOMER");
  if (!user.customerProfile) throw new HttpError("You do not have access to this.", 403);
  return ok(await listAddresses(user.customerProfile.id));
});

export const POST = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  if (!user.customerProfile) throw new HttpError("You do not have access to this.", 403);
  const body = z
    .object({
      label: z.string().trim().min(1, "Name this address.").max(40),
      addressLine: z.string().trim().min(3, "Enter the address.").max(160),
      latitude: z.number().optional().nullable(),
      longitude: z.number().optional().nullable(),
    })
    .parse(await readJson(req));
  return ok(await createAddress(user.customerProfile.id, body), 201);
});
