"use client";

import { Suspense } from "react";
import { SearchScreen } from "@/components/browse-screens";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Loading search...</p>}>
      <SearchScreen />
    </Suspense>
  );
}
