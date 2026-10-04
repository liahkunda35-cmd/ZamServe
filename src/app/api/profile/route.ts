import { z } from "zod";
import { route, ok, readJson } from "@/lib/http";
import { requireUser, unreadCounts } from "@/lib/auth";
import { loadAccount, updateProfile } from "@/lib/account";
import { toMe } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const body = z
    .object({
      fullName: z.string().trim().min(2).max(80).optional(),
      avatarUrl: z.string().nullable().optional(),
      businessName: z.string().trim().min(2).max(80).optional(),
      bio: z.string().max(500).optional(),
      serviceArea: z.string().trim().min(2).max(80).optional(),
      baseAddress: z.string().max(160).optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
    .parse(await readJson(req));
  await updateProfile(user.id, body);
  const fresh = await loadAccount(user.id);
  const profileId = fresh.role === "CUSTOMER" ? fresh.customerProfile?.id : fresh.providerProfile?.id;
  return ok(toMe(fresh, await unreadCounts(fresh.id, fresh.role, profileId)));
});
