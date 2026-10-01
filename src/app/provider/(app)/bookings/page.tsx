"use client";

import { Suspense } from "react";
import { ProviderBookings } from "@/components/provider-screens";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProviderBookings />
    </Suspense>
  );
}
