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
      <main className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-2xl mx-auto mb-4 border border-red-200">
            🛡️
          </div>
          <h1 className="text-2xl font-sans font-bold text-black uppercase tracking-tight mb-2">
            Administrative Access Denied
          </h1>
          <p className="text-sm text-[#2D2D2D] mb-6 leading-relaxed">
            Your patron account (<span className="font-semibold text-black">{user.email}</span>) does not possess atelier management privileges.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 px-4 py-2.5 bg-[#051A6E] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#041456] transition-colors"
            >
              Return to Storefront
            </Link>
            <Link
              href="/account"
              className="flex-1 px-4 py-2.5 border border-[#E5E7EB] text-[#2D2D2D] text-xs font-bold uppercase tracking-wider hover:bg-neutral-50 transition-colors"
            >
              My Patron Profile
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-black flex flex-col lg:flex-row">
      <AdminSidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
