"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { getWaitlistEntries, deleteWaitlistEntry, WaitlistEntry } from "@/lib/api";

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWaitlistEntries({
        search: search || undefined,
        limit,
        offset: page * limit,
      });
      setEntries(data.entries);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the waitlist?`)) return;
    try {
      await deleteWaitlistEntry(id);
      load();
    } catch {
      // ignore
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminAuthGuard>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Waitlist</h1>
            <p className="text-gray-400 text-sm mt-1">
              {total} {total === 1 ? "person" : "people"} signed up
            </p>
          </div>
          <button
            onClick={() => {
              const csv = [
                "Name,Email,University,Signed Up",
                ...entries.map(
                  (e) =>
                    `"${e.name}","${e.email}","${e.university}","${new Date(e.created_at).toLocaleDateString()}"`
                ),
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `yuni-waitlist-${new Date().toISOString().split("T")[0]}.csv`;
              a.click();
            }}
            className="px-4 py-2 bg-pink-500/20 text-pink-400 rounded-lg hover:bg-pink-500/30 transition text-sm font-medium"
          >
            Export CSV
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or university..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {search ? "No results found" : "No one on the waitlist yet"}
          </div>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      University
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Signed Up
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition"
                    >
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {page * limit + i + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {entry.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {entry.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {entry.university}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(entry.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(entry.id, entry.name)}
                          className="text-xs text-red-400 hover:text-red-300 transition"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminAuthGuard>
  );
}
