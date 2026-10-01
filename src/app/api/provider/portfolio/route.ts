import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  const photos = await prisma.portfolioImage.findMany({
    where: { providerId: user.providerProfile.id },
    orderBy: { createdAt: "desc" },
  });
  return ok(photos);
});

export const POST = route(async (req) => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  const body = z.object({ imageUrl: z.string().min(1), caption: z.string().max(80).optional() }).parse(await readJson(req));
  const count = await prisma.portfolioImage.count({ where: { providerId: user.providerProfile.id } });
  if (count >= 2) throw new HttpError("You can keep 2 portfolio photos. Replace one to change it.", 400);
  const photo = await prisma.portfolioImage.create({
    data: { providerId: user.providerProfile.id, imageUrl: body.imageUrl, caption: body.caption?.trim() ?? "" },
  });
  return ok(photo, 201);
});
