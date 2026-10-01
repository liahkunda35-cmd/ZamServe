"use client";

import { AppShell } from "@/components/shell";
import type { ReactNode } from "react";

export default function CustomerAppLayout({ children }: { children: ReactNode }) {
  return <AppShell role="CUSTOMER">{children}</AppShell>;
}
