import { z } from "zod";
import { route, ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { addProviderService, providerServices } from "@/lib/provider-admin";
import { HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser("PROVIDER");
  return ok(await providerServices(user.providerProfile!.id));
});

export const POST = route(async (req) => {
  const user = await requireUser("PROVIDER");
  const body = z
    .object({
      serviceId: z.string().optional(),
      categoryId: z.string().optional(),
      newServiceName: z.string().optional(),
      price: z.number().int(),
      description: z.string().optional(),
      durationMinutes: z.number().int().optional(),
      imageUrl: z.string().max(200).optional().nullable(),
    })
    .parse(await readJson(req));
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  await addProviderService(user.providerProfile.id, body);
  return ok(await providerServices(user.providerProfile.id), 201);
});
