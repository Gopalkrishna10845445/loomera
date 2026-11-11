import { notFound, redirect } from "next/navigation";
import { getSessionTokenFromCookies } from "@/lib/auth/cookies";
import { validateSession } from "@/lib/auth/session";
import { getUserOrderById } from "@/lib/orders/order-service";
import OrderDetailClient from "@/components/OrderDetailClient";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const token = await getSessionTokenFromCookies();
  const sessionData = await validateSession(token);

  if (!sessionData) {
    redirect(`/login?redirect=/orders/${id}`);
  }

  const order = await getUserOrderById(sessionData.user.id, id);
  if (!order) {
    notFound();
  }

  return <OrderDetailClient user={sessionData.user} order={order} />;
}
