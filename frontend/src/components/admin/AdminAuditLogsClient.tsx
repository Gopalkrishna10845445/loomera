"use client";

import React, { useState } from "react";

interface AuditLogRecord {
  id: string;
  adminId: string;
  adminEmail: string | null;
  adminName: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  previousState: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  newState: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  ipAddress: string | null;
  createdAt: Date;
}

interface AdminAuditLogsClientProps {
  initialLogs: AuditLogRecord[];
  totalLogs: number;
}

export default function AdminAuditLogsClient({
  initialLogs,
  totalLogs,
}: AdminAuditLogsClientProps) {
  const [logs] = useState<AuditLogRecord[]>(initialLogs);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [filterAction, setFilterAction] = useState("all");

  const filteredLogs = logs.filter((l) =>
    filterAction === "all" ? true : l.action === filterAction
  );

  const getActionBadgeColor = (action: string) => {
    if (action.includes("CREATED") || action.includes("RESTORED")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (action.includes("DELETED") || action.includes("ARCHIVED") || action.includes("REFUNDED")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (action.includes("ROLE") || action.includes("SECURITY")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-sky-50 text-sky-700 border-sky-200";
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#2A9D8F] font-semibold">
            Security & Governance
          </span>
          <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Administrative Audit Ledger
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Immutable log of all administrative actions, catalog modifications, stock updates, and role alterations.
          </p>
        </div>
        <div className="bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm text-xs font-mono text-stone-600">
          Total Logged Operations: <span className="font-bold text-stone-900">{totalLogs}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500 font-medium">Filter Action:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
          >
            <option value="all">All Actions</option>
            <option value="INVENTORY_ADJUSTED">Inventory Adjusted</option>
            <option value="PRODUCT_CREATED">Product Created</option>
            <option value="PRODUCT_UPDATED">Product Updated</option>
            <option value="PRODUCT_ARCHIVED">Product Archived</option>
            <option value="ORDER_STATUS_CHANGED">Order Status Changed</option>
            <option value="ORDER_REFUNDED">Order Refunded</option>
            <option value="USER_ROLE_CHANGED">User Role Changed</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold bg-stone-50">
                <th className="py-3.5 px-4">Timestamp (IST)</th>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Resource Target</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-stone-400">
                    No administrative audit events recorded yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-stone-900">
                      <div>
                        <span>{log.adminName || "Administrator"}</span>
                        <p className="text-[10px] text-stone-400 font-mono">{log.adminEmail}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-stone-600">
                      <span className="font-bold text-stone-800">{log.resourceType}:</span>{" "}
                      <span className="truncate max-w-[140px] inline-block align-bottom">{log.resourceId}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500">
                      {log.ipAddress || "Internal"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-[11px] transition-colors"
                      >
                        View Diff ↗
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* State Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-400">Audit Checkpoint</span>
                <h3 className="text-lg font-serif font-bold text-stone-900">{selectedLog.action}</h3>
                <p className="text-xs text-stone-500 font-mono">
                  {selectedLog.resourceType} • {selectedLog.resourceId}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs font-mono">
              <div>
                <p className="text-stone-500 text-[10px] uppercase font-bold mb-1">Previous State</p>
                <pre className="bg-stone-50 p-3 rounded-lg border border-stone-200 overflow-x-auto text-[11px] text-stone-700">
                  {selectedLog.previousState
                    ? JSON.stringify(selectedLog.previousState, null, 2)
                    : "null (Resource creation or opening checkpoint)"}
                </pre>
              </div>

              <div>
                <p className="text-stone-500 text-[10px] uppercase font-bold mb-1">New State Delta</p>
                <pre className="bg-stone-50 p-3 rounded-lg border border-stone-200 overflow-x-auto text-[11px] text-stone-900 font-semibold">
                  {selectedLog.newState
                    ? JSON.stringify(selectedLog.newState, null, 2)
                    : "null (Resource deletion)"}
                </pre>
              </div>

              <div className="pt-2 text-[11px] text-stone-500 font-sans border-t border-stone-100 flex items-center justify-between">
                <span>Authorized by {selectedLog.adminEmail}</span>
                <span>IP: {selectedLog.ipAddress || "Internal System"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
