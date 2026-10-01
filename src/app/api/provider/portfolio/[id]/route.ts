import { prisma } from "@/lib/prisma";
import { route, ok, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const DELETE = route(async (_req, ctx) => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  const { id } = await ctx.params;
  const photo = await prisma.portfolioImage.findUnique({ where: { id } });
  if (!photo || photo.providerId !== user.providerProfile.id) throw new HttpError("That photo could not be found.", 404);
  await prisma.portfolioImage.delete({ where: { id } });
  return ok({ ok: true });
});
