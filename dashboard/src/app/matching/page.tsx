"use client";

import { useEffect, useState } from "react";
import {
  getPendingRequests,
  createManualGroup,
  runBatchMatching,
  PendingDateRequest,
} from "@/lib/api";

const ACTIVITY_COLORS: Record<string, string> = {
  coffee: "bg-amber-900/30 border-amber-700/30",
  dinner: "bg-red-900/30 border-red-700/30",
  bowling: "bg-blue-900/30 border-blue-700/30",
  hiking: "bg-green-900/30 border-green-700/30",
  karaoke: "bg-purple-900/30 border-purple-700/30",
};

function getActivityStyle(activity: string) {
  const key = activity.toLowerCase();
  for (const [name, style] of Object.entries(ACTIVITY_COLORS)) {
    if (key.includes(name)) return style;
  }
  return "bg-gray-900 border-gray-800";
}

export default function MatchingPage() {
  const [requests, setRequests] = useState<PendingDateRequest[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activity, setActivity] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [batchResult, setBatchResult] = useState("");

  const loadRequests = () => {
    setLoading(true);
    getPendingRequests()
      .then((data) => {
        setRequests(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectedRequests = requests.filter((r) => selected.has(r.user_id));
  const maleCount = selectedRequests.filter((r) => r.user.gender === "male").length;
  const femaleCount = selectedRequests.filter((r) => r.user.gender === "female").length;
  const totalSelected = selectedRequests.length;
  const isValidGroup =
    (totalSelected === 4 || totalSelected === 6) && maleCount === femaleCount;

  const handleCreateGroup = async () => {
    if (!isValidGroup) return;
    if (!activity || !scheduledDate || !scheduledTime) {
      setError("Please fill in activity, date, and time.");
      return;
    }
    setError("");
    setSuccess("");
    try {
      const userIds = Array.from(selected);
      await createManualGroup({
        user_ids: userIds,
        activity,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      });
      setSuccess("Group created successfully!");
      setSelected(new Set());
      setActivity("");
      setScheduledDate("");
      setScheduledTime("");
      loadRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create group");
    }
  };

  const handleBatchMatch = async () => {
    setBatchResult("");
    setError("");
    try {
      const result = await runBatchMatching();
      setBatchResult(`Batch matching complete: ${result.groups_formed} group(s) formed.`);
      loadRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch matching failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manual Matching</h1>
        <button
          onClick={handleBatchMatch}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Run Batch Matching
        </button>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}
      {success && <p className="text-green-400 mb-4">{success}</p>}
      {batchResult && <p className="text-blue-400 mb-4">{batchResult}</p>}

      {/* Manual Match Form */}
      {totalSelected > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-gray-300">
              Selected: <span className="font-bold text-blue-400">{maleCount}M</span>,{" "}
              <span className="font-bold text-pink-400">{femaleCount}F</span>
              <span className="text-gray-500 ml-2">({totalSelected} total)</span>
            </span>
            {!isValidGroup && totalSelected > 0 && (
              <span className="text-xs text-yellow-400">
                Need 4 or 6 with equal gender split
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <input
              type="text"
              placeholder="Activity (e.g. Coffee)"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <button
            onClick={handleCreateGroup}
            disabled={!isValidGroup}
            className="px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            Create Group
          </button>
        </div>
      )}

      {/* Pending Requests Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Pending Date Requests</h2>
          <p className="text-sm text-gray-400 mt-1">
            Select users to create a manual group match
          </p>
        </div>

        {loading ? (
          <p className="p-4 text-gray-400">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="p-4 text-gray-400">No pending requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="p-3 w-10"></th>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3">Age</th>
                  <th className="p-3">Activity</th>
                  <th className="p-3">Group Size</th>
                  <th className="p-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer ${getActivityStyle(req.activity)} ${
                      selected.has(req.user_id) ? "ring-1 ring-pink-500/50" : ""
                    }`}
                    onClick={() => toggleSelect(req.user_id)}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(req.user_id)}
                        onChange={() => toggleSelect(req.user_id)}
                        className="accent-pink-500"
                      />
                    </td>
                    <td className="p-3 font-medium">
                      {req.user.first_name} {req.user.last_name}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          req.user.gender === "male"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-pink-500/20 text-pink-300"
                        }`}
                      >
                        {req.user.gender === "male" ? "M" : "F"}
                      </span>
                    </td>
                    <td className="p-3">{req.user.age}</td>
                    <td className="p-3">{req.activity}</td>
                    <td className="p-3">{req.group_size}</td>
                    <td className="p-3 text-gray-400">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
