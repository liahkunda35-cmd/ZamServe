"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./ui";

export function AppHeader() {
  const pathname = usePathname();
  const welcome = pathname === "/";

  return (
    <div className={welcome
      ? "absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.45rem,env(safe-area-inset-top))]"
      : "flex shrink-0 items-center justify-between gap-2 bg-cream px-4 pb-2 pt-[max(0.45rem,env(safe-area-inset-top))]"}>
      <BrandLogo compact />
      {welcome && (
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/choose-role" className="btn-3d btn-3d-light rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#4a3120]">
            Sign In
          </Link>
          <Link href="/choose-role" className="btn-3d btn-3d-cta rounded-full px-3 py-1.5 text-[11px] font-semibold text-white">
            Sign Up
          </Link>
        </div>
      )}
    </div>
  );
}
