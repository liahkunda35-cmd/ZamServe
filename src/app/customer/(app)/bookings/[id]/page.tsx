import { CustomerBookingDetail } from "@/components/customer-activity";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerBookingDetail id={id} />;
}
