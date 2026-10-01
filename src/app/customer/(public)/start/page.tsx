import Link from "next/link";
import { BackLink } from "@/components/ui";

export default function CustomerStartPage() {
  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <BackLink href="/choose-role" />
      <h1 className="mt-5 font-display text-[2rem] leading-none">Customer</h1>
      <p className="mt-2 text-sm text-muted">Sign in to an existing account, or create a customer account.</p>
      <div className="mt-8 grid gap-3">
        <Link href="/customer/login" prefetch className="btn-3d btn-3d-light flex h-14 items-center justify-center rounded-full text-sm font-semibold text-[#4a3120]">
          Sign In
        </Link>
        <Link href="/customer/register" prefetch className="btn-3d btn-3d-cta flex h-14 items-center justify-center rounded-full text-sm font-semibold text-white">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
