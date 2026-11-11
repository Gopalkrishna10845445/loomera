"use client";

import React, { useState } from "react";
import { formatInr } from "@/lib/currency";
import { UserRole } from "@/lib/auth/session";

interface CustomerItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: Date;
  orderCount: number;
  totalSpendInr: number;
  lastOrderDate: Date | null;
}

interface AdminCustomersClientProps {
  initialCustomers: CustomerItem[];
  currentUserRole: UserRole;
}

export default function AdminCustomersClient({
  initialCustomers,
  currentUserRole,
}: AdminCustomersClientProps) {
  const [customers, setCustomers] = useState<CustomerItem[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === "all" || c.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleInspectCustomer = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/customers/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load customer profile");

      setSelectedCustomer(data.customer);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: UserRole) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/customers/${targetUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");

      setStatusMessage({ type: "success", text: `Role updated to ${newRole}!` });
      setCustomers((prev) =>
        prev.map((c) => (c.id === targetUserId ? { ...c, role: newRole } : c))
      );
      if (selectedCustomer) {
        setSelectedCustomer({ ...selectedCustomer, role: newRole });
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#2A9D8F] font-semibold">
            Patronage Management
          </span>
          <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Patrons & Clients
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Registered atelier clientele, lifetime order value, account status, and role management.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-lg text-xs font-medium flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-stone-400 hover:text-stone-700 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="Search patrons by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs px-3.5 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2A9D8F] bg-stone-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Role:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white"
          >
            <option value="all">All Roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold bg-stone-50">
                <th className="py-3.5 px-4">Patron Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Orders</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4">Joined Atelier</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-stone-400">
                    No patrons matching the specified filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-stone-900">
                      {c.fullName}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600 font-mono text-[11px]">
                      {c.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          c.role === "SUPER_ADMIN"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : c.role === "ADMIN"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-stone-100 text-stone-600 border-stone-200"
                        }`}
                      >
                        {c.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-stone-900">
                      {c.orderCount} orders
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      {formatInr(c.totalSpendInr)}
                    </td>
                    <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleInspectCustomer(c.id)}
                        className="px-3 py-1.5 rounded-md bg-[#264653] text-white text-[11px] font-semibold hover:bg-[#1E353F] transition-colors"
                      >
                        Profile →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-400">Patron Dossier</span>
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  {selectedCustomer.fullName}
                </h2>
                <p className="text-xs text-stone-500 font-mono">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 pt-4 text-xs">
              {/* Role Management (Only for SUPER_ADMIN) */}
              {currentUserRole === "SUPER_ADMIN" && (
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200/80">
                  <h3 className="font-semibold text-purple-900 mb-1">Administrative Role Control</h3>
                  <p className="text-stone-600 mb-3 text-[11px]">
                    Super administrators can assign atelier management roles.
                  </p>
                  <div className="flex items-center gap-2">
                    {(["CUSTOMER", "ADMIN", "SUPER_ADMIN"] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleUpdateRole(selectedCustomer.id, r)}
                        disabled={selectedCustomer.role === r || isLoading}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all border ${
                          selectedCustomer.role === r
                            ? "bg-[#264653] text-white border-[#264653]"
                            : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Order History */}
              <div>
                <h3 className="font-serif font-bold text-stone-900 mb-2">
                  Order History ({selectedCustomer.orders?.length || 0})
                </h3>
                <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 max-h-48 overflow-y-auto bg-white">
                  {selectedCustomer.orders?.length === 0 ? (
                    <p className="p-4 text-center text-stone-400">No placed orders found.</p>
                  ) : (
                    selectedCustomer.orders.map((o: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <div key={o.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-mono font-semibold text-stone-900">{o.orderNumber}</p>
                          <p className="text-[10px] text-stone-400">
                            {new Date(o.createdAt).toLocaleDateString("en-IN")} • {o.itemCount} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-stone-900">{formatInr(o.totalInr)}</p>
                          <span className="text-[10px] font-semibold text-stone-600 font-mono">
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Saved Addresses */}
              <div>
                <h3 className="font-serif font-bold text-stone-900 mb-2">Delivery Addresses</h3>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {selectedCustomer.addresses?.length === 0 ? (
                    <p className="text-stone-400">No saved addresses.</p>
                  ) : (
                    selectedCustomer.addresses.map((addr: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <div key={addr.id} className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <p className="font-semibold text-stone-800">{addr.fullName} ({addr.phone})</p>
                        <p className="text-stone-600">
                          {addr.addressLine1}, {addr.city}, {addr.state} - {addr.postalCode}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
