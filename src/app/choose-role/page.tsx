import Link from "next/link";
import { ChevronRight, Lock, MapPin, Search, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { BackLink } from "@/components/ui";

const pills = {
  provider: [
    { icon: ShieldCheck, label: "Verified & Trusted" },
    { icon: Zap, label: "More Bookings" },
    { icon: TrendingUp, label: "Grow Your Income" },
  ],
  customer: [
    { icon: Search, label: "Verified Providers" },
    { icon: MapPin, label: "Real-time Location" },
    { icon: Lock, label: "Safe & Secure Payments" },
  ],
} as const;

function RoleCard({
  href,
  image,
  title,
  body,
  kind,
}: {
  href: string;
  image: string;
  title: string;
  body: string;
  kind: keyof typeof pills;
}) {
  return (
    <Link href={href} prefetch className="role-card block rounded-[28px] border border-[#ead9bf] bg-white p-3 shadow-[0_10px_28px_rgba(111,75,50,0.08)]">
      <div className="flex items-center gap-3">
        <span className="block h-[7.4rem] w-[6.1rem] shrink-0 overflow-hidden rounded-[22px] bg-[#f6ead8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-cover object-top" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-[#8a7362]">I am a</span>
          <span className="mt-0.5 block font-display text-[1.55rem] leading-none text-[#3a2a22]">{title}</span>
          <span className="mt-1.5 block text-[12px] leading-snug text-[#5c4636]">{body}</span>
        </span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#c6a15b] text-white">
          <ChevronRight size={18} />
        </span>
      </div>
      <span className="mt-3 grid grid-cols-3 gap-1.5">
        {pills[kind].map((item) => (
          <span key={item.label} className="flex items-center gap-1 rounded-full bg-[#f8f1e6] px-1.5 py-1.5">
            <item.icon size={13} className="shrink-0 text-[#b8893d]" />
            <span className="text-[9px] font-semibold leading-tight text-[#5c4636]">{item.label}</span>
          </span>
        ))}
      </span>
    </Link>
  );
}

export default function ChooseRolePage() {
  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <BackLink href="/" />
      <h1 className="mt-4 font-display text-[2.35rem] leading-none text-[#3a2a22]">Get Started</h1>
      <p className="mt-2 text-[15px] leading-snug text-[#5c4636]">
        Choose how you want to use <span className="font-semibold text-[#6f4b32]">ZamServe</span>
      </p>
      <div className="mt-5 grid gap-3">
        <RoleCard
          href="/provider/start"
          image="/images/role-provider.png"
          title="Service Provider"
          body="Offer your skills and get service requests."
          kind="provider"
        />
        <RoleCard
          href="/customer/start"
          image="/images/role-customer.png"
          title="Customer"
          body="Find and book trusted service providers near you."
          kind="customer"
        />
      </div>
      <p className="mt-5 text-center text-[11px] tracking-wide text-[#8a7362]">Same platform. Different needs.</p>
    </div>
  );
}
