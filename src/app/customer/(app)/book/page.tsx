"use client";

import { Suspense } from "react";
import { BookingFlow } from "@/components/booking-flow";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Loading booking...</p>}>
      <BookingFlow />
    </Suspense>
  );
}
