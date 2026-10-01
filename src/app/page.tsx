"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const HEADLINE = "Skilled work when you need it";

export default function WelcomePage() {
  const [count, setCount] = useState(0);
  const typed = count >= HEADLINE.length;

  useEffect(() => {
    if (typed) return;
    const timer = window.setTimeout(() => setCount((value) => value + 1), count === 0 ? 420 : 48);
    return () => window.clearTimeout(timer);
  }, [count, typed]);

  return (
    <div className="relative h-full overflow-hidden bg-[#3a2418]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/welcome.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_22%]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/70" />

      <div className="relative flex h-full w-full min-w-0 flex-col px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mt-auto">
          <div className="mb-28">
            <h1 className="min-h-[4.6rem] font-display text-[2.15rem] leading-[1.05] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
              {HEADLINE.slice(0, count)}
              {typed ? null : <span className="type-caret" style={{ background: "#fff" }} aria-hidden />}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              Book beauty, handy work, and cleaning from people near you.
            </p>
          </div>
          <Link href="/choose-role" className="cta-in btn-3d btn-3d-cta flex h-14 items-center justify-center rounded-full text-[15px] font-semibold text-white">
            Get Started
          </Link>
          <p className="mt-3 text-center text-xs text-white/85">
            Already have an account?{" "}
            <Link href="/choose-role" className="font-semibold text-white">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
