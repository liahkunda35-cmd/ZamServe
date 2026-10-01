import { ChatThread } from "@/components/customer-activity";

export default async function Page({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <ChatThread bookingId={bookingId} back="/provider/messages" />;
}
