"use client";

import { useEffect, useState } from "react";
import { getReports, updateReport, ReportResponse } from "@/lib/api";

const STATUS_OPTIONS = ["pending", "reviewed", "resolved", "dismissed"];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const loadReports = () => {
    setLoading(true);
    getReports({ status: statusFilter || undefined })
      .then((data) => {
        setReports(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const handleUpdateStatus = async (reportId: string, status: string) => {
    try {
      const updated = await updateReport(reportId, {
        status,
        admin_notes: adminNotes[reportId] || undefined,
      });
      setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-4 text-gray-400">Loading...</p>
        ) : reports.length === 0 ? (
          <p className="p-4 text-gray-400">No reports found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="p-3">Reporter</th>
                <th className="p-3">Reported User</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <>
                  <tr
                    key={report.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                  >
                    <td className="p-3 font-mono text-xs">{report.reporter_id.slice(0, 8)}...</td>
                    <td className="p-3 font-mono text-xs">{report.reported_id.slice(0, 8)}...</td>
                    <td className="p-3">{report.category}</td>
                    <td className="p-3">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="p-3 text-gray-400">{new Date(report.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {report.status !== "reviewed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(report.id, "reviewed"); }}
                            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                          >
                            Review
                          </button>
                        )}
                        {report.status !== "resolved" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(report.id, "resolved"); }}
                            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                          >
                            Resolve
                          </button>
                        )}
                        {report.status !== "dismissed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(report.id, "dismissed"); }}
                            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === report.id && (
                    <tr key={`${report.id}-detail`} className="border-b border-gray-800/50 bg-gray-800/30">
                      <td colSpan={6} className="p-4">
                        <div className="space-y-3">
                          {report.description && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Description</p>
                              <p className="text-sm">{report.description}</p>
                            </div>
                          )}
                          {report.admin_notes && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Admin Notes</p>
                              <p className="text-sm">{report.admin_notes}</p>
                            </div>
                          )}
                          <div>
                            <input
                              type="text"
                              placeholder="Add admin notes..."
                              value={adminNotes[report.id] || ""}
                              onChange={(e) => setAdminNotes({ ...adminNotes, [report.id]: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300",
    reviewed: "bg-blue-500/20 text-blue-300",
    resolved: "bg-green-500/20 text-green-300",
    dismissed: "bg-gray-500/20 text-gray-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || "bg-gray-700 text-gray-300"}`}>
      {status}
    </span>
  );
}
