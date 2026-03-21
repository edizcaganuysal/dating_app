"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getUserDetail, updateUser, AdminUserDetail } from "@/lib/api";

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    getUserDetail(userId).then(setUser).catch((e) => setError(e.message));
  }, [userId]);

  const handleToggleSuspend = async () => {
    if (!user) return;
    try {
      const updated = await updateUser(userId, { is_suspended: !user.is_suspended });
      setUser(updated);
      setActionMsg(updated.is_suspended ? "User suspended." : "User unsuspended.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };

  const handleToggleAdmin = async () => {
    if (!user) return;
    try {
      const updated = await updateUser(userId, { is_admin: !user.is_admin });
      setUser(updated);
      setActionMsg(updated.is_admin ? "User is now admin." : "Admin rights removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };

  if (error) return <p className="text-red-400">{error}</p>;
  if (!user) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">User Detail</h1>

      {actionMsg && <p className="text-green-400 mb-4 text-sm">{actionMsg}</p>}

      {/* Profile Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{user.first_name} {user.last_name}</h2>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                user.gender === "male" ? "bg-blue-500/20 text-blue-300" : "bg-pink-500/20 text-pink-300"
              }`}>
                {user.gender}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">Age {user.age}</span>
              {user.program && (
                <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{user.program}</span>
              )}
              {user.is_email_verified && (
                <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-300">Email Verified</span>
              )}
              {user.is_selfie_verified && (
                <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-300">Selfie Verified</span>
              )}
              {user.is_admin && (
                <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-300">Admin</span>
              )}
              {user.is_suspended && (
                <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-300">Suspended</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleSuspend}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                user.is_suspended
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {user.is_suspended ? "Unsuspend" : "Suspend"}
            </button>
            <button
              onClick={handleToggleAdmin}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                user.is_admin
                  ? "bg-gray-600 hover:bg-gray-700 text-white"
                  : "bg-yellow-600 hover:bg-yellow-700 text-white"
              }`}
            >
              {user.is_admin ? "Remove Admin" : "Make Admin"}
            </button>
          </div>
        </div>

        {user.bio && <p className="mt-4 text-gray-300 text-sm">{user.bio}</p>}

        {user.interests.length > 0 && (
          <div className="mt-3 flex gap-1.5 flex-wrap">
            {user.interests.map((interest) => (
              <span key={interest} className="px-2 py-0.5 rounded-full text-xs bg-pink-500/10 text-pink-300">
                {interest}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 text-sm">
          <div>
            <span className="text-gray-500">No-Shows</span>
            <p className="font-bold">{user.no_show_count}</p>
          </div>
          <div>
            <span className="text-gray-500">University</span>
            <p className="font-bold">{user.university_domain}</p>
          </div>
          <div>
            <span className="text-gray-500">Joined</span>
            <p className="font-bold">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          {user.year_of_study && (
            <div>
              <span className="text-gray-500">Year</span>
              <p className="font-bold">{user.year_of_study}</p>
            </div>
          )}
        </div>
      </div>

      {/* Groups */}
      <Section title="Groups" count={user.groups.length}>
        {user.groups.length === 0 ? (
          <p className="text-gray-500 text-sm">No groups yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="p-3">Activity</th>
                <th className="p-3">Date</th>
                <th className="p-3">Time</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {user.groups.map((g) => (
                <tr key={g.id} className="border-b border-gray-800/50">
                  <td className="p-3">{g.activity}</td>
                  <td className="p-3">{g.scheduled_date}</td>
                  <td className="p-3">{g.scheduled_time}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{g.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Matches */}
      <Section title="Matches" count={user.matches.length}>
        {user.matches.length === 0 ? (
          <p className="text-gray-500 text-sm">No matches yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="p-3">Partner</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {user.matches.map((m) => (
                <tr key={m.id} className="border-b border-gray-800/50">
                  <td className="p-3">{m.partner_name}</td>
                  <td className="p-3 text-gray-400">{new Date(m.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Reports */}
      <Section title="Reports" count={user.reports.length}>
        {user.reports.length === 0 ? (
          <p className="text-gray-500 text-sm">No reports.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="p-3">Direction</th>
                <th className="p-3">Other User</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {user.reports.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/50">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      r.direction === "filed" ? "bg-blue-500/20 text-blue-300" : "bg-orange-500/20 text-orange-300"
                    }`}>
                      {r.direction}
                    </span>
                  </td>
                  <td className="p-3">{r.other_user_name}</td>
                  <td className="p-3">{r.category}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{r.status}</span>
                  </td>
                  <td className="p-3 text-gray-400">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
      <div className="p-4 border-b border-gray-800">
        <h3 className="font-semibold">
          {title} <span className="text-gray-500 text-sm font-normal">({count})</span>
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
