"use client";

import { AppShell } from "@/components/shell";
import type { ReactNode } from "react";

export default function ProviderAppLayout({ children }: { children: ReactNode }) {
  return <AppShell role="PROVIDER">{children}</AppShell>;
}
