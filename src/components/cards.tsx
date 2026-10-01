"use client";

import Link from "next/link";
import { Sparkles, SprayCan, Wrench, type LucideIcon } from "lucide-react";
import { kwacha } from "@/lib/format";
import type { ProviderCard as Provider } from "@/lib/types";
import { Avatar, Stars, Verified } from "./ui";

const icons: Record<string, LucideIcon> = { sparkles: Sparkles, wrench: Wrench, spray: SprayCan };

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Sparkles;
  return <Icon className={className} size={22} />;
}

export function ProviderCard({ provider, href }: { provider: Provider; href: string }) {
  const service = provider.services[0];
  return (
    <Link href={href} className="press flex gap-3 rounded-[22px] border border-line bg-card p-3 shadow-[0_8px_20px_rgba(74,49,32,0.05)]">
      <Avatar src={provider.avatarUrl} name={provider.name} size={62} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{provider.name}</p>
            <Verified show={provider.verified} />
          </div>
          {provider.minPrice != null && <p className="shrink-0 text-sm font-semibold text-brown">From {kwacha(provider.minPrice)}</p>}
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <Stars value={provider.rating} size={12} />
          <span>{provider.rating.toFixed(1)} · {provider.reviewCount} reviews</span>
        </p>
        <p className="mt-1 truncate text-xs text-muted">
          {service?.name ?? "Services"} · {provider.distanceKm != null ? `${provider.distanceKm} km` : provider.serviceArea}
        </p>
      </div>
    </Link>
  );
}
