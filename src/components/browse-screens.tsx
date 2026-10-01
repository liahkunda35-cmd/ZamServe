"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Heart, MapPin, Search } from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { kwacha, weekdayName } from "@/lib/format";
import type { Category, ProviderCard, ServiceItem } from "@/lib/types";
import { CategoryIcon, ProviderCard as Card } from "./cards";
import { Avatar, BackLink, Banner, Button, EmptyState, LoadingBlock, Screen, SectionTitle, Stars, Verified } from "./ui";

export function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Category[]>("/api/categories").then(setCategories).catch(() => setError("Unable to load categories. Please try again."));
  }, []);
  return (
    <Screen>
      <BackLink href="/customer/home" />
      <h1 className="mt-3 font-display text-[2rem]">Categories</h1>
      <p className="mt-1 text-sm text-muted">Beauty & cosmetics, repairs, and cleaning.</p>
      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {!categories && !error && <div className="mt-4"><LoadingBlock label="Loading categories..." /></div>}
      <div className="mt-4 space-y-3">
        {categories?.map((category) => (
          <Link key={category.id} href={`/customer/categories/${category.slug}`} className="press relative block h-36 overflow-hidden rounded-[24px]">
            {category.imageUrl && <img src={category.imageUrl} alt="" className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-r from-ink/75 to-ink/10" />
            <div className="absolute inset-0 flex items-end p-4 text-white">
              <div>
                <CategoryIcon name={category.icon} className="mb-2" />
                <p className="font-display text-2xl leading-none">{category.name}</p>
                <p className="mt-1 text-xs text-white/80">{category.services.length} services</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Screen>
  );
}

export function CategoryDetail({ slug }: { slug: string }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Category>(`/api/categories/${slug}`).then(setCategory).catch(() => setError("Unable to load this category. Please try again."));
  }, [slug]);
  return (
    <Screen>
      <BackLink href="/customer/categories" />
      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {!category && !error && <div className="mt-4"><LoadingBlock label="Loading services..." /></div>}
      {category && category.slug === "beauty-cosmetics" && (
        <>
          <h1 className="mt-3 font-display text-[2rem] leading-none">{category.name}</h1>
          <p className="mt-2 text-sm text-muted">Choose barbershop or salon. They are listed separately.</p>
          <div className="mt-4 grid gap-3">
            <Link href="/customer/categories/beauty-cosmetics/barbershop" className="card-in press relative block h-36 overflow-hidden rounded-[24px]">
              <img src="/images/barbershop.jpg" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <span className="absolute bottom-4 left-4 text-white">
                <span className="block font-display text-2xl leading-none">Barbershop Services</span>
                <span className="mt-1 block text-xs text-white/80">Cuts, fades, shaves, beard work</span>
              </span>
            </Link>
            <Link href="/customer/categories/beauty-cosmetics/salon" className="card-in press relative block h-36 overflow-hidden rounded-[24px]" style={{ animationDelay: "90ms" }}>
              <img src="/images/salon.jpg" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <span className="absolute bottom-4 left-4 text-white">
                <span className="block font-display text-2xl leading-none">Salon Services</span>
                <span className="mt-1 block text-xs text-white/80">Braids, nails, makeup, styling</span>
              </span>
            </Link>
          </div>
        </>
      )}
      {category && category.slug !== "beauty-cosmetics" && (
        <>
          <h1 className="mt-3 font-display text-[2rem] leading-none">{category.name}</h1>
          <p className="mt-2 text-sm text-muted">{category.description}</p>
          <div className="mt-4 space-y-5">
            {category.services.length === 0 && <EmptyState title="No services yet" body="Providers can add services in this category." />}
            {serviceGroups(category.services).map((group) => (
              <section key={group.label}>
                {group.label && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{group.label}</p>}
                <div className="space-y-2">
                  {group.services.map((service) => (
                    <Link key={service.id} href={`/customer/search?service=${service.slug}`} className="press flex items-center justify-between rounded-[20px] border border-line bg-card px-4 py-3">
                      <span>
                        <span className="block font-semibold">{service.name}</span>
                        <span className="text-xs text-muted">{service.providerCount} {service.providerCount === 1 ? "provider" : "providers"}</span>
                      </span>
                      <span className="link-blue inline-flex h-8 items-center rounded-full bg-[#e8f1ff] px-3 text-sm font-semibold">View</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}

export function SearchScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const service = params.get("service") ?? "";
  const [query, setQuery] = useState(initial);
  const [providers, setProviders] = useState<ProviderCard[] | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const coords = readCoords();
    const search = new URLSearchParams();
    if (service) search.set("service", service);
    if (initial) search.set("q", initial);
    if (coords) {
      search.set("lat", String(coords.lat));
      search.set("lng", String(coords.lng));
    }
    setLoading(true);
    setError("");
    const request = service
      ? api<ProviderCard[]>(`/api/providers?${search.toString()}`).then((rows) => {
          setProviders(rows);
          setServices([]);
        })
      : api<{ providers: ProviderCard[]; services: ServiceItem[]; categories: Category[] }>(`/api/search?${search.toString()}`).then((result) => {
          setProviders(result.providers);
          setServices(result.services);
          setCategories(result.categories);
        });
    request.catch(() => setError("Unable to load providers. Please try again.")).finally(() => setLoading(false));
  }, [initial, service]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    router.push(`/customer/search?q=${encodeURIComponent(query)}`);
  }

  const title = service ? service.replace(/-/g, " ") : initial ? `Results for “${initial}”` : "Search";

  return (
    <Screen>
      <BackLink href="/customer/home" />
      <form onSubmit={onSubmit} className="mt-3 flex h-12 items-center gap-2 rounded-full border border-line bg-card px-4">
        <Search size={16} className="text-muted" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Haircut, phone repair, cleaning..." className="w-full bg-transparent text-sm outline-none" />
      </form>
      <h1 className="mt-4 font-display text-[1.7rem] capitalize">{title}</h1>
      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {loading && <div className="mt-4"><LoadingBlock label="Loading providers..." /></div>}
      {!loading && categories.length > 0 && !service && (
        <div className="mt-4 grid gap-2">
          {categories.map((category) => (
            <Link key={category.id} href={`/customer/categories/${category.slug}`} className="press flex items-center gap-3 rounded-[20px] border border-line bg-card p-2">
              {category.imageUrl && <img src={category.imageUrl} alt="" className="h-14 w-16 rounded-2xl object-cover" />}
              <span>
                <span className="block font-semibold">{category.name}</span>
                <span className="text-xs text-muted">{category.services.length} services</span>
              </span>
            </Link>
          ))}
        </div>
      )}
      {!loading && services.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {services.map((item) => (
            <Link key={item.id} href={`/customer/search?service=${item.slug}`} className="rounded-full bg-gold-soft px-3 py-1.5 text-xs font-semibold text-brown-dark">
              {item.name}
            </Link>
          ))}
        </div>
      )}
      {!loading && providers && providers.length === 0 && (
        <div className="mt-4"><EmptyState title="No providers currently offer this service." body="Try another service, or check back as more providers join." /></div>
      )}
      <div className="mt-4 space-y-3">
        {providers?.map((provider) => <Card key={provider.id} provider={provider} href={`/customer/providers/${provider.id}${service ? `?service=${service}` : ""}`} />)}
      </div>
    </Screen>
  );
}

export function PublicProvider({ id }: { id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const serviceSlug = params.get("service");
  const [provider, setProvider] = useState<ProviderCard | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const coords = readCoords();
    const search = new URLSearchParams();
    if (coords) {
      search.set("lat", String(coords.lat));
      search.set("lng", String(coords.lng));
    }
    api<ProviderCard>(`/api/providers/${id}?${search.toString()}`)
      .then((result) => {
        setProvider(result);
        const match = result.services.find((service) => service.slug === serviceSlug) ?? result.services[0];
        setSelected(match?.id ?? "");
      })
      .catch(() => setError("Unable to load this provider. Please try again."));
  }, [id, serviceSlug]);

  async function favorite() {
    if (!provider) return;
    const result = await api<{ favorite: boolean }>("/api/favorites", { method: "POST", body: JSON.stringify({ providerId: provider.id }) });
    setProvider({ ...provider, favorite: result.favorite });
  }

  return (
    <div>
      <div className="relative h-56 bg-sand">
        {provider?.avatarUrl && <img src={provider.avatarUrl} alt="" className="h-full w-full object-cover" />}
        <div className="absolute left-4 top-4"><BackLink href="/customer/home" /></div>
      </div>
      <Screen className="pt-4">
        {error && <Banner>{error}</Banner>}
        {!provider && !error && <LoadingBlock label="Loading provider..." />}
        {provider && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-[1.8rem] leading-none">{provider.name}</h1>
                <p className="mt-1 text-sm text-muted">{provider.personName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Verified show={provider.verified} />
                  {!provider.verified && <span className="text-[11px] font-semibold text-muted">{provider.verificationStatus === "PENDING" ? "Pending verification" : provider.verificationStatus}</span>}
                </div>
              </div>
              <button onClick={favorite} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-card" aria-label="Save provider">
                <Heart size={18} className={provider.favorite ? "fill-danger text-danger" : "text-brown"} />
              </button>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Stars value={provider.rating} /> {provider.rating.toFixed(1)} · {provider.reviewCount} reviews
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin size={14} /> {provider.distanceKm != null ? `${provider.distanceKm} km · ` : ""}{provider.serviceArea}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => router.push("/customer/messages")}>Chat after booking</Button>
              <Button onClick={() => selected && router.push(`/customer/book?provider=${provider.id}&service=${selected}`)}>Book service</Button>
            </div>
            <SectionTitle title="About" />
            <p className="text-sm leading-relaxed text-ink/80">{provider.bio || "This provider has not added a description yet."}</p>
            <div className="mt-5">
              <SectionTitle title="Work" />
              {provider.portfolio && provider.portfolio.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {provider.portfolio.map((photo) => (
                    <img key={photo.id} src={photo.imageUrl} alt={photo.caption} className="h-24 w-full rounded-2xl object-cover" />
                  ))}
                </div>
              ) : (
                <EmptyState title="No work photos yet" body="Photos of this provider's work will show here." />
              )}
            </div>
            <div className="mt-5">
              <SectionTitle title="Services" />
              <div className="space-y-2">
                {provider.services.map((service) => (
                  <button key={service.id} onClick={() => setSelected(service.id)} className={`flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left ${selected === service.id ? "border-brown bg-gold-soft/40" : "border-line bg-card"}`}>
                    <span>
                      <span className="block font-semibold">{service.name}</span>
                      <span className="text-xs text-muted">{service.category} · {service.durationMinutes} min</span>
                    </span>
                    <span className="font-semibold text-brown">{kwacha(service.price)}</span>
                  </button>
                ))}
              </div>
            </div>
            {provider.availability && (
              <div className="mt-5">
                <SectionTitle title="Availability" />
                <div className="flex flex-wrap gap-2">
                  {provider.availability.filter((day) => day.isActive).map((day) => (
                    <span key={day.dayOfWeek} className="rounded-full bg-card px-3 py-1 text-xs border border-line">{weekdayName(day.dayOfWeek).slice(0, 3)} {day.startTime}–{day.endTime}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5">
              <SectionTitle title="Reviews" />
              {provider.reviews?.length ? provider.reviews.map((review) => (
                <div key={review.id} className="mb-3 rounded-[20px] border border-line bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Avatar src={review.authorAvatar} name={review.authorName} size={32} />
                    <div>
                      <p className="text-sm font-semibold">{review.authorName}</p>
                      <Stars value={review.rating} size={12} />
                    </div>
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-ink/80">{review.comment}</p>}
                </div>
              )) : <EmptyState title="No reviews yet" body="Ratings appear after completed bookings." />}
            </div>
          </>
        )}
      </Screen>
    </div>
  );
}

export function SectionServices({ slug, section, initial = null }: { slug: string; section: "barbershop" | "salon"; initial?: Category | null }) {
  const [category, setCategory] = useState<Category | null>(initial);
  const [error, setError] = useState("");
  useEffect(() => {
    if (initial) return;
    api<Category>(`/api/categories/${slug}`).then(setCategory).catch(() => setError("Unable to load these services. Please try again."));
  }, [slug, initial]);
  const title = section === "barbershop" ? "Barbershop Services" : "Salon Services";
  const services = category?.services.filter((service) => service.section === section || service.section === "both") ?? [];
  return (
    <Screen>
      <BackLink href={`/customer/categories/${slug}`} />
      <h1 className="mt-3 font-display text-[2rem] leading-none">{title}</h1>
      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {!category && !error && <div className="mt-4"><LoadingBlock label="Loading services..." /></div>}
      {category && services.length === 0 && <div className="mt-4"><EmptyState title="No services yet" body="Providers can add services in this list." /></div>}
      <div className="mt-4 space-y-2">
        {services.map((service, index) => (
          <Link key={service.id} href={`/customer/search?service=${service.slug}`} className="card-in press flex items-center justify-between rounded-[20px] border border-line bg-card px-4 py-3" style={{ animationDelay: `${index * 40}ms` }}>
            <span>
              <span className="block font-semibold">{service.name}</span>
              <span className="text-xs text-muted">{service.providerCount} {service.providerCount === 1 ? "provider" : "providers"}</span>
            </span>
            <span className="link-blue inline-flex h-8 items-center rounded-full bg-[#e8f1ff] px-3 text-sm font-semibold">View</span>
          </Link>
        ))}
      </div>
    </Screen>
  );
}

function serviceGroups(services: ServiceItem[]) {
  const barbershop = services.filter((service) => service.section === "barbershop" || service.section === "both");
  const salon = services.filter((service) => service.section === "salon" || service.section === "both");
  const other = services.filter((service) => service.section !== "barbershop" && service.section !== "salon" && service.section !== "both");
  return [
    barbershop.length ? { label: "Barbershop", services: barbershop } : null,
    salon.length ? { label: "Salon", services: salon } : null,
    other.length ? { label: "", services: other } : null,
  ].filter((group): group is { label: string; services: ServiceItem[] } => Boolean(group));
}

function readCoords() {
  try {
    const raw = sessionStorage.getItem("zam_coords");
    return raw ? JSON.parse(raw) as { lat: number; lng: number } : null;
  } catch {
    return null;
  }
}
