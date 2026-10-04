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
  const [popup, setPopup] = useState<{ id: string; title: string; body: string; href: string | null } | null>(null);
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

  useEffect(() => {
    if (role !== "PROVIDER") return;
    const seen = new Set<string>();
    let ready = false;
    let stop = false;
    async function look() {
      try {
        const rows = await api<{ id: string; type: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string }[]>("/api/notifications");
        if (stop) return;
        if (!ready) {
          rows.forEach((item) => seen.add(item.id));
          ready = true;
          const recent = rows.find((item) => !item.readAt && item.type === "NEW_BOOKING" && Date.now() - new Date(item.createdAt).getTime() < 2 * 60 * 1000);
          if (recent) setPopup(recent);
          return;
        }
        const fresh = rows.find((item) => !seen.has(item.id) && !item.readAt);
        rows.forEach((item) => seen.add(item.id));
        if (!fresh) return;
        setPopup(fresh);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(fresh.title, { body: fresh.body });
        }
      } catch {
        /* keep the current screen if the notification check fails */
      }
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
    look();
    const timer = window.setInterval(look, 5000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [role]);

  useEffect(() => {
    if (!popup) return;
    const timer = window.setTimeout(() => setPopup(null), 8000);
    return () => window.clearTimeout(timer);
  }, [popup]);

  const items = role === "CUSTOMER" ? customerNav : providerNav;

  return (
    <AppContext.Provider value={me ? { me, refresh } : null}>
      <div className="relative flex h-full min-h-0 flex-col">
        {popup && (
          <button
            type="button"
            onClick={() => {
              const href = popup.href;
              setPopup(null);
              if (href) router.push(href);
            }}
            className="absolute inset-x-3 top-3 z-40 rounded-[22px] border border-line bg-card px-4 py-3 text-left shadow-[0_16px_40px_rgba(58,42,28,0.28)]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">ZamServe · now</p>
            <p className="mt-1 text-sm font-semibold">{popup.title}</p>
            <p className="mt-0.5 text-xs text-muted">{popup.body}</p>
          </button>
        )}
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
          <nav className={cn("grid", role === "PROVIDER" ? "mx-3 mb-[max(10px,env(safe-area-inset-bottom))] rounded-[26px] border border-line bg-card px-1 py-1 shadow-[0_12px_30px_rgba(74,49,32,0.08)]" : "border-t border-line bg-card/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2")} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
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
                    role === "PROVIDER" && "min-h-12 text-[10px]",
                    active ? "bg-sage text-forest" : "text-muted",
                  )}
                >
                  <span className="relative">
                    <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                    {badge > 0 && <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-forest px-1 text-[9px] text-white">{badge}</span>}
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
