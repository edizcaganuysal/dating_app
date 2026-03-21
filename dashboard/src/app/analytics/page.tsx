"use client";

import { useEffect, useState } from "react";
import {
  getAnalytics,
  seedDatabase,
  triggerNoshowCheck,
  AnalyticsResponse,
  NoshowUser,
} from "@/lib/api";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState("");
  const [seedMsg, setSeedMsg] = useState("");
  const [noshowResult, setNoshowResult] = useState<NoshowUser[] | null>(null);

  useEffect(() => {
    getAnalytics().then(setAnalytics).catch((e) => setError(e.message));
  }, []);

  const handleSeed = async () => {
    setSeedMsg("");
    try {
      const result = await seedDatabase();
      setSeedMsg(result.detail);
      const updated = await getAnalytics();
      setAnalytics(updated);
    } catch (e) {
      setSeedMsg(e instanceof Error ? e.message : "Seed failed");
    }
  };

  const handleNoshowCheck = async () => {
    setNoshowResult(null);
    try {
      const result = await triggerNoshowCheck();
      setNoshowResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No-show check failed");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!analytics && !error && <p className="text-gray-400">Loading...</p>}

      {analytics && (
        <div className="space-y-6">
          {/* User Stats */}
          <StatsSection title="User Stats">
            <StatItem label="Total Users" value={analytics.total_users} />
            <StatItem label="Active Users (30d)" value={analytics.active_users} />
          </StatsSection>

          {/* Matching Stats */}
          <StatsSection title="Matching Stats">
            <StatItem label="Total Groups" value={analytics.total_groups} />
            <StatItem label="Total Matches" value={analytics.total_matches} />
          </StatsSection>

          {/* Feedback Stats */}
          <StatsSection title="Feedback Stats">
            <StatItem
              label="Avg Experience Rating"
              value={analytics.avg_experience_rating != null ? analytics.avg_experience_rating.toFixed(1) : "—"}
            />
          </StatsSection>

          {/* Safety Stats */}
          <StatsSection title="Safety Stats">
            <StatItem label="Pending Reports" value={analytics.total_reports_pending} />
            <StatItem label="Total No-Shows" value={analytics.no_show_count_total} />
          </StatsSection>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={handleSeed}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Seed Database
        </button>
        <button
          onClick={handleNoshowCheck}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Check No-Shows
        </button>
      </div>

      {seedMsg && <p className="mt-3 text-sm text-green-400">{seedMsg}</p>}

      {noshowResult && (
        <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold">No-Show Users ({noshowResult.length})</h3>
          </div>
          {noshowResult.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">No users flagged.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">No-Shows</th>
                  <th className="p-3">Suspended</th>
                </tr>
              </thead>
              <tbody>
                {noshowResult.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800/50">
                    <td className="p-3">{u.first_name} {u.last_name}</td>
                    <td className="p-3 text-gray-400">{u.email}</td>
                    <td className="p-3">{u.no_show_count}</td>
                    <td className="p-3">
                      {u.is_suspended ? (
                        <span className="text-red-400 text-xs">Yes</span>
                      ) : (
                        <span className="text-gray-500 text-xs">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function StatsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">{children}</div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
    </div>
  );
}
