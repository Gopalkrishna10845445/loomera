"use client";

import React, { useState } from "react";

interface AdminSupportRow {
  id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  customerName: string;
  customerEmail: string;
  orderNumber: string | null;
  messageCount: number;
}

interface AdminSupportClientProps {
  initialTickets: AdminSupportRow[];
}

export default function AdminSupportClient({ initialTickets }: AdminSupportClientProps) {
  const [tickets, setTickets] = useState<AdminSupportRow[]>(initialTickets);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Inspector & Reply Drawer
  const [activeTicket, setActiveTicket] = useState<any | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [adminReply, setAdminReply] = useState("");
  const [newStatus, setNewStatus] = useState("IN_PROGRESS");
  const [newPriority, setNewPriority] = useState("MEDIUM");

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      search === "" ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
      (t.orderNumber && t.orderNumber.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = selectedStatus === "ALL" || t.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleOpenTicket = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/support/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load ticket");

      setActiveTicket(data.ticket);
      setNewStatus(data.ticket.status);
      setNewPriority(data.ticket.priority);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Load error";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !adminReply.trim()) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/support/${activeTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: adminReply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reply");

      setActiveTicket((prev: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        ...prev,
        status: "WAITING_FOR_CUSTOMER",
        messages: [
          ...prev.messages,
          {
            id: data.message.id,
            senderRole: "ADMIN",
            senderName: "LOOMERA Atelier Concierge",
            message: adminReply,
            createdAt: new Date(),
          },
        ],
      }));

      setTickets((prev) =>
        prev.map((t) =>
          t.id === activeTicket.id
            ? { ...t, status: "WAITING_FOR_CUSTOMER", messageCount: t.messageCount + 1 }
            : t
        )
      );

      setAdminReply("");
      setStatusMessage({ type: "success", text: "Reply transmitted to customer" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reply failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatusAndPriority = async () => {
    if (!activeTicket) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/support/${activeTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, priority: newPriority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update ticket");

      setActiveTicket((prev: any) => ({ ...prev, status: newStatus, priority: newPriority })); // eslint-disable-line @typescript-eslint/no-explicit-any
      setTickets((prev) =>
        prev.map((t) => (t.id === activeTicket.id ? { ...t, status: newStatus, priority: newPriority } : t))
      );
      setStatusMessage({ type: "success", text: "Ticket status and priority updated" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "IN_PROGRESS":
        return "bg-sky-50 text-sky-800 border-sky-200";
      case "WAITING_FOR_CUSTOMER":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "RESOLVED":
      case "CLOSED":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-rose-700 font-bold bg-rose-50 border-rose-200";
      case "HIGH":
        return "text-orange-700 font-bold bg-orange-50 border-orange-200";
      case "MEDIUM":
        return "text-stone-700 font-medium bg-stone-50 border-stone-200";
      default:
        return "text-stone-500 bg-stone-50 border-stone-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#2A9D8F] font-semibold">
            Concierge &amp; Customer Care
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
            Customer Support Helpdesk
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Triage patron inquiries, resolve order &amp; logistics exceptions, and maintain exemplary atelier service SLAs.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-stone-400 hover:text-stone-700">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="Search tickets by subject, #, or patron..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-stone-300 bg-white shadow-xs focus:ring-2 focus:ring-[#264653]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {["ALL", "OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider uppercase transition-colors border ${
                selectedStatus === st
                  ? "bg-[#264653] text-white border-[#264653]"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold bg-stone-50">
                <th className="py-3.5 px-4">Ticket #</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Patron</th>
                <th className="py-3.5 px-4">Order Ref</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No support tickets matching your selection.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900">{t.ticketNumber}</td>
                    <td className="py-3.5 px-4 font-medium text-stone-900 max-w-[220px] truncate">{t.subject}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-900">{t.customerName}</div>
                      <div className="text-[11px] text-stone-400">{t.customerEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-600">{t.orderNumber || "—"}</td>
                    <td className="py-3.5 px-4 uppercase text-[10px] tracking-wider text-stone-500">
                      {t.category.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(t.status)}`}>
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenTicket(t.id)}
                        className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium transition-colors"
                      >
                        Reply ({t.messageCount})
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details & Thread Drawer */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-400">Support Ticket Thread</span>
                <h2 className="text-lg font-serif font-bold text-stone-900">
                  {activeTicket.ticketNumber} — {activeTicket.subject}
                </h2>
              </div>
              <button onClick={() => setActiveTicket(null)} className="text-stone-400 hover:text-stone-700 font-bold">
                ✕
              </button>
            </div>

            {/* Quick Status / Priority Bar */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-stone-500">Status:</span>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="px-2 py-1 rounded border border-stone-300 bg-white"
                >
                  {["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"].map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-stone-500">Priority:</span>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="px-2 py-1 rounded border border-stone-300 bg-white"
                >
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleUpdateStatusAndPriority}
                disabled={isLoading}
                className="px-3 py-1 rounded bg-[#264653] text-white font-semibold hover:bg-[#1E353F]"
              >
                Apply
              </button>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
              {activeTicket.messages?.map((msg: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                    msg.senderRole === "ADMIN"
                      ? "bg-[#264653]/10 border border-[#264653]/20 ml-6"
                      : "bg-stone-50 border border-stone-200 mr-6"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] text-stone-500">
                    <span className="font-bold text-stone-800">
                      {msg.senderRole === "ADMIN" ? "👑 Atelier Staff" : `👤 ${msg.senderName || "Patron"}`}
                    </span>
                    <span>{new Date(msg.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendReply} className="pt-3 border-t border-stone-200 space-y-2">
              <textarea
                rows={3}
                required
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                placeholder="Compose authoritative patron response..."
                className="w-full p-3 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-[#264653]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-lg bg-[#2A9D8F] hover:bg-[#238276] text-white text-xs font-bold shadow-xs"
                >
                  Transmit Reply to Patron
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
