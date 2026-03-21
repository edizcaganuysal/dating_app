"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUsers, AdminUserSummary } from "@/lib/api";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [suspended, setSuspended] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 20;

  const loadUsers = useCallback(() => {
    setLoading(true);
    getUsers({
      search: search || undefined,
      gender: gender || undefined,
      is_suspended: suspended === "" ? undefined : suspended === "true",
      limit,
      offset: page * limit,
    })
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [search, gender, suspended, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 w-64"
        />
        <select
          value={gender}
          onChange={(e) => { setGender(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100"
        >
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <select
          value={suspended}
          onChange={(e) => { setSuspended(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100"
        >
          <option value="">All Status</option>
          <option value="false">Active</option>
          <option value="true">Suspended</option>
        </select>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-4 text-gray-400">Loading...</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Gender</th>
                    <th className="p-3">Age</th>
                    <th className="p-3">Verified</th>
                    <th className="p-3">Suspended</th>
                    <th className="p-3">No-Shows</th>
                    <th className="p-3">Groups</th>
                    <th className="p-3">Matches</th>
                    <th className="p-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => router.push(`/users/${user.id}`)}
                      className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer"
                    >
                      <td className="p-3 font-medium">{user.first_name} {user.last_name}</td>
                      <td className="p-3 text-gray-400">{user.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          user.gender === "male" ? "bg-blue-500/20 text-blue-300" : "bg-pink-500/20 text-pink-300"
                        }`}>
                          {user.gender === "male" ? "M" : "F"}
                        </span>
                      </td>
                      <td className="p-3">{user.age}</td>
                      <td className="p-3">
                        {user.is_email_verified ? (
                          <span className="text-green-400 text-xs">Yes</span>
                        ) : (
                          <span className="text-gray-500 text-xs">No</span>
                        )}
                      </td>
                      <td className="p-3">
                        {user.is_suspended ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-300">Suspended</span>
                        ) : (
                          <span className="text-gray-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3">{user.no_show_count}</td>
                      <td className="p-3">{user.total_groups}</td>
                      <td className="p-3">{user.total_matches}</td>
                      <td className="p-3 text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-gray-800">
                <span className="text-sm text-gray-400">{total} users total</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-400">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
