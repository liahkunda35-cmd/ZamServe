import { notFound } from "next/navigation";
import { SectionServices } from "@/components/browse-screens";
import { getCategory } from "@/lib/catalog";

export default async function Page({ params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section } = await params;
  if (section !== "barbershop" && section !== "salon") notFound();
  const category = await getCategory(slug).catch(() => null);
  if (!category) notFound();
  return <SectionServices slug={slug} section={section} initial={category} />;
}
