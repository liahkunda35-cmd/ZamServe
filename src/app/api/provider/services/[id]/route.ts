import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { providerServices, removeProviderService, updateProviderService } from "@/lib/provider-admin";

export const dynamic = "force-dynamic";

export const PATCH = route(async (req, ctx) => {
  const user = await requireUser("PROVIDER");
  const { id } = await ctx.params;
  const body = z
    .object({
      price: z.number().int().optional(),
      description: z.string().optional(),
      durationMinutes: z.number().int().optional(),
      isActive: z.boolean().optional(),
      imageUrl: z.string().max(200).optional().nullable(),
    })
    .parse(await readJson(req));
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  await updateProviderService(user.providerProfile.id, id, body);
  return ok(await providerServices(user.providerProfile.id));
});

export const DELETE = route(async (_req, ctx) => {
  const user = await requireUser("PROVIDER");
  const { id } = await ctx.params;
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  const result = await removeProviderService(user.providerProfile.id, id);
  return ok({ ...result, services: await providerServices(user.providerProfile.id) });
});
