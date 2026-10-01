import { CategoryDetail } from "@/components/browse-screens";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CategoryDetail slug={slug} />;
}
