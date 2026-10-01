import { Suspense } from "react";
import { PublicProvider } from "@/components/browse-screens";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Loading provider...</p>}>
      <PublicProvider id={id} />
    </Suspense>
  );
}
