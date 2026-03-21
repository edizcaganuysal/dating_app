"use client";

import { useEffect, useState } from "react";
import { getAnalytics, AnalyticsResponse } from "@/lib/api";

const STAT_CARDS = [
  { key: "total_users" as const, label: "Total Users", color: "text-blue-400" },
  { key: "active_users" as const, label: "Active Users", color: "text-green-400" },
  { key: "total_groups" as const, label: "Total Groups", color: "text-purple-400" },
  { key: "total_matches" as const, label: "Total Matches", color: "text-pink-400" },
  { key: "total_reports_pending" as const, label: "Pending Reports", color: "text-yellow-400" },
  { key: "avg_experience_rating" as const, label: "Avg Rating", color: "text-cyan-400" },
];

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnalytics().then(setAnalytics).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!analytics && !error && <p className="text-gray-400">Loading...</p>}

      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STAT_CARDS.map((card) => {
            const value = analytics[card.key];
            return (
              <div
                key={card.key}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6"
              >
                <p className="text-sm text-gray-400 mb-1">{card.label}</p>
                <p className={`text-3xl font-bold ${card.color}`}>
                  {value != null ? (typeof value === "number" && !Number.isInteger(value) ? value.toFixed(1) : value) : "—"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
