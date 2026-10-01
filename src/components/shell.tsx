"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Home, MessageCircle, UserRound, Wallet } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, cn } from "@/lib/client";
import type { Me } from "@/lib/types";

type AppState = { me: Me; refresh: () => Promise<void> };
const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("Missing app shell");
  return value;
}

const customerNav = [
  { href: "/customer/home", label: "Home", icon: Home },
  { href: "/customer/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/customer/messages", label: "Messages", icon: MessageCircle },
  { href: "/customer/profile", label: "Profile", icon: UserRound },
];

const providerNav = [
  { href: "/provider/home", label: "Home", icon: Home },
  { href: "/provider/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/provider/earnings", label: "Earnings", icon: Wallet },
  { href: "/provider/messages", label: "Messages", icon: MessageCircle },
  { href: "/provider/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ role, children }: { role: "CUSTOMER" | "PROVIDER"; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const hideNav =
    pathname === "/customer/book" ||
    /\/messages\/[^/]+/.test(pathname) ||
    /\/bookings\/[^/]+/.test(pathname);

  const refresh = useCallback(async () => {
    const data = await api<Me>("/api/auth/me");
    if (data.role !== role) {
      router.replace(data.role === "PROVIDER" ? "/provider/home" : "/customer/home");
      return;
    }
    setMe(data);
  }, [role, router]);

  useEffect(() => {
    let stop = false;
    refresh().catch(() => {
      if (!stop) router.replace(role === "PROVIDER" ? "/provider/login" : "/customer/login");
    });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh().catch(() => undefined);
    }, 12000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [refresh, role, router]);

  useEffect(() => {
    const hrefs = (role === "CUSTOMER" ? customerNav : providerNav).map((item) => item.href).filter((href) => href !== pathname);
    let index = 0;
    let timer = 0;
    const warm = () => {
      const href = hrefs[index++];
      if (!href) return;
      router.prefetch(href);
      fetch(href, { credentials: "same-origin" }).catch(() => undefined);
      timer = window.setTimeout(warm, 250);
    };
    timer = window.setTimeout(warm, 400);
    return () => window.clearTimeout(timer);
  }, [pathname, role, router]);

  const items = role === "CUSTOMER" ? customerNav : providerNav;

  return (
    <AppContext.Provider value={me ? { me, refresh } : null}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="scroll-area min-h-0 flex-1 overflow-y-auto">
          {me ? children : (
            <div className="space-y-3 px-5 pt-6">
              <div className="h-8 w-40 animate-pulse rounded-full bg-sand" />
              <div className="h-28 animate-pulse rounded-[24px] bg-sand/80" />
              <div className="h-28 animate-pulse rounded-[24px] bg-sand/70" />
            </div>
          )}
        </div>
        {!hideNav && (
          <nav className="grid border-t border-line bg-card/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge = item.label === "Messages" ? me?.unreadMessages ?? 0 : 0;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  scroll
                  className={cn(
                    "relative grid min-h-14 place-items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-semibold active:bg-sand/70",
                    active ? "text-brown" : "text-muted",
                  )}
                >
                  <span className="relative">
                    <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                    {badge > 0 && <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brown px-1 text-[9px] text-white">{badge}</span>}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </AppContext.Provider>
  );
}
