import { route, ok } from "@/lib/http";
import { getCategory } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, ctx) => {
  const { slug } = await ctx.params;
  return ok(await getCategory(slug));
});
