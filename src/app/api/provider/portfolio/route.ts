import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { addPortfolio, listPortfolio } from "@/lib/account";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  return ok(await listPortfolio(user.providerProfile.id));
});

export const POST = route(async (req) => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  const body = z.object({ imageUrl: z.string().min(1), caption: z.string().max(80).optional() }).parse(await readJson(req));
  return ok(await addPortfolio(user.providerProfile.id, body.imageUrl, body.caption?.trim() ?? ""), 201);
});
