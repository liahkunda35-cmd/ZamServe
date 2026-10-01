import { route, ok } from "@/lib/http";
import { listCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok(await listCategories()));
