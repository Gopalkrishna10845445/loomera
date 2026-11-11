import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionTokenFromCookies } from "@/lib/auth/cookies";
import { validateSession } from "@/lib/auth/session";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getSessionTokenFromCookies();
  const sessionData = await validateSession(token);

  if (!sessionData) {
    redirect("/login?redirect=/admin");
  }

  const { user } = sessionData;

  // Strict RBAC: only ADMIN and SUPER_ADMIN can enter /admin
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 bg-white border border-stone-200 rounded-2xl shadow-xl">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto mb-4 border border-rose-200">
            🛡️
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mb-2">
            Administrative Access Denied
          </h1>
          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            Your patron account (<span className="font-medium text-stone-900">{user.email}</span>) does not possess atelier management privileges.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#264653] text-white text-sm font-medium hover:bg-[#1E353F] transition-colors"
            >
              Return to Storefront
            </Link>
            <Link
              href="/account"
              className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              My Patron Profile
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F1EB] text-stone-900 flex flex-col lg:flex-row">
      <AdminSidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
