"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, MapPin, Search } from "lucide-react";
import { api } from "@/lib/client";
import { firstName, greeting } from "@/lib/format";
import { searchQuery } from "@/lib/validate";
import type { Category, ProviderCard, ServiceItem } from "@/lib/types";
import { useApp } from "./shell";
import { ProviderCard as Card } from "./cards";
import { Gate, useFormGate } from "./form-gate";
import { Avatar, Banner, EmptyState, LoadingBlock, Screen, SectionTitle } from "./ui";

type HomeData = {
  categories: Category[];
  popularServices: ServiceItem[];
  recommended: ProviderCard[];
  featured: Category | null;
};

export function CustomerHome() {
  const router = useRouter();
  const { me } = useApp();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");
  const [place, setPlace] = useState("Lusaka, Zambia");
  const [query, setQuery] = useState("");
  const searchGate = useFormGate([{ id: "q", message: searchQuery(query) }]);

  useEffect(() => {
    let ignore = false;
    async function load(lat?: number, lng?: number) {
      try {
        const params = new URLSearchParams();
        if (lat != null && lng != null) {
          params.set("lat", String(lat));
          params.set("lng", String(lng));
        }
        const result = await api<HomeData>(`/api/customer/home?${params.toString()}`);
        if (!ignore) setData(result);
      } catch {
        if (!ignore) setError("Unable to load home. Please try again.");
      }
    }
    load();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        sessionStorage.setItem("zam_coords", JSON.stringify({ lat, lng }));
        load(lat, lng);
        try {
          const found = await api<{ label: string }>(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
          if (!ignore) setPlace(found.label.split(",").slice(0, 2).join(","));
        } catch {
          if (!ignore) setPlace("Current location");
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <Screen>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[1.65rem] leading-tight sm:text-[1.85rem]">
            <TypedGreeting text={`${greeting()}, ${firstName(me.fullName)}`} />
          </h1>
          <p className="mt-1 text-sm text-muted">What service do you need today?</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/customer/notifications" className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-card">
            <Bell size={18} />
            {me.unreadNotifications > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-gold" />}
          </Link>
          <Link href="/customer/profile"><Avatar src={me.avatarUrl} name={me.fullName} size={42} /></Link>
        </div>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); if (searchGate.blockSubmit()) return; router.push(`/customer/search?q=${encodeURIComponent(query.trim())}`); }} className="mt-4">
        <Gate id="q" gate={searchGate}>
          <div className="flex h-12 items-center gap-2 rounded-full border border-line bg-card px-4 shadow-[0_8px_20px_rgba(74,49,32,0.05)] focus-within:border-forest">
            <Search size={16} className="text-forest" />
            <input name="q" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a service..." className="w-full bg-transparent text-sm outline-none" {...searchGate.input("q")} />
          </div>
          {searchGate.error("q") && <span className="mt-1 block px-4 text-xs text-danger">{searchGate.error("q")}</span>}
        </Gate>
      </form>
      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {!data && !error && <div className="mt-5"><LoadingBlock label="Loading home..." /></div>}
      {data && (
        <div className="mt-5 space-y-6">
          {data.featured && (
            <Link href={`/customer/categories/${data.featured.slug}`} className="press relative block h-[188px] overflow-hidden rounded-[28px] shadow-[0_10px_24px_rgba(74,49,32,0.08)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/dashboard-hero.jpg?v=1" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
              <div className="relative flex h-full w-[52%] flex-col justify-between p-4 sm:p-5">
                <p className="flex items-center gap-1 text-[11px] font-medium text-[#6f4b32]"><MapPin size={12} className="text-forest" /> {place}</p>
                <p className="font-display text-[1.55rem] leading-[1.05] text-[#3a2a1c] sm:text-[1.75rem]">Quality service near you</p>
                <span className="btn-3d btn-3d-cta mt-3 inline-flex h-9 w-fit items-center rounded-full px-4 text-xs font-semibold text-white">Book now</span>
              </div>
            </Link>
          )}
          <section>
            <SectionTitle title="Service categories" action={<Link href="/customer/categories" className="text-xs font-semibold text-forest">See all</Link>} />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {data.categories.map((category, index) => (
                <Link key={category.id} href={`/customer/categories/${category.slug}`} className="card-in press flex min-h-[148px] flex-col items-center justify-between rounded-[22px] border border-sage-line bg-card px-2 py-3 text-center shadow-[0_8px_18px_rgba(74,49,32,0.05)]" style={{ animationDelay: `${index * 70}ms` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={categoryIcon(category.slug)} alt="" className="h-20 w-full object-contain sm:h-24" />
                  <span className="mt-1 text-[11px] font-semibold leading-tight text-ink sm:text-xs">{category.name}</span>
                </Link>
              ))}
            </div>
          </section>
          {data.popularServices.length > 0 && (
            <section>
              <SectionTitle title="Popular services" />
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.popularServices.map((service) => (
                  <Link key={service.id} href={`/customer/search?service=${service.slug}`} className="press shrink-0 rounded-full border border-sage-line bg-card px-3 py-2 text-xs font-semibold text-brown">
                    {service.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section>
            <SectionTitle title="Recommended" />
            {data.recommended.length === 0 ? (
              <EmptyState title="No providers yet" body="Providers will appear here once they add services." />
            ) : (
              <div className="space-y-3">
                {data.recommended.map((provider, index) => (
                  <div key={provider.id} className="rise" style={{ animationDelay: `${index * 40}ms` }}>
                    <Card provider={provider} href={`/customer/providers/${provider.id}`} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Screen>
  );
}

function categoryIcon(slug: string) {
  if (slug === "beauty-cosmetics") return "/images/beauty-tools.jpg";
  if (slug === "repairs") return "/images/repair-tools.jpg";
  if (slug === "cleaning") return "/images/cleaning-tools.jpg";
  return "/images/beauty-tools.jpg";
}

function TypedGreeting({ text }: { text: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
  }, [text]);
  useEffect(() => {
    if (count >= text.length) return;
    const timer = window.setTimeout(() => setCount((value) => value + 1), count === 0 ? 200 : 42);
    return () => window.clearTimeout(timer);
  }, [count, text]);
  return (
    <span>
      {text.slice(0, count)}
      {count < text.length && <span className="type-caret" aria-hidden />}
    </span>
  );
}
