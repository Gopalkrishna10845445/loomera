import { redirect } from "next/navigation";
import { getSessionTokenFromCookies } from "@/lib/auth/cookies";
import { validateSession } from "@/lib/auth/session";
import AccountClient from "@/components/AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const token = await getSessionTokenFromCookies();
  const sessionData = await validateSession(token);

  if (!sessionData) {
    redirect("/login?redirect=/account");
  }

  return <AccountClient user={sessionData.user} />;
}
