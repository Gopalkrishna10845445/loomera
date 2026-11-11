import { redirect } from "next/navigation";
import { getSessionTokenFromCookies } from "@/lib/auth/cookies";
import { validateSession } from "@/lib/auth/session";
import { getUserOrders } from "@/lib/orders/order-service";
import OrdersClient from "@/components/OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const token = await getSessionTokenFromCookies();
  const sessionData = await validateSession(token);

  if (!sessionData) {
    redirect("/login?redirect=/orders");
  }

  const orders = await getUserOrders(sessionData.user.id);

  return <OrdersClient user={sessionData.user} orders={orders} />;
}
