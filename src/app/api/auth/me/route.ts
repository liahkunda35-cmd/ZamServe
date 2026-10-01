import { route, ok } from "@/lib/http";
import { requireUser, unreadCounts } from "@/lib/auth";
import { toMe } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const profileId = user.role === "CUSTOMER" ? user.customerProfile?.id : user.providerProfile?.id;
  const counts = await unreadCounts(user.id, user.role, profileId);
  return ok(toMe(user, counts));
});
