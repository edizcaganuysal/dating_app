"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createDateRequestForUser, getUsers, AdminUserSummary } from "@/lib/api";

const ACTIVITIES = [
  "dinner", "bar", "bowling", "karaoke", "board_games", "ice_skating",
  "hiking", "cooking_class", "trivia_night", "mini_golf", "escape_room",
  "art_gallery", "picnic", "museum",
];

const TIME_WINDOWS = ["morning", "afternoon", "evening", "night"];

interface Slot {
  date: string;
  time_window: string;
}

export default function CreateDateRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedUserId, setSelectedUserId] = useState("");
  const [groupSize, setGroupSize] = useState(4);
  const [activity, setActivity] = useState("dinner");
  const [slots, setSlots] = useState<Slot[]>([{ date: "", time_window: "evening" }]);

  useEffect(() => {
    getUsers({ limit: 100 }).then((data) => setUsers(data.users)).catch(() => {});
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      !searchQuery ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const addSlot = () => setSlots((s) => [...s, { date: "", time_window: "evening" }]);
  const removeSlot = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, field: keyof Slot, value: string) =>
    setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, [field]: value } : slot)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) { setError("Select a user"); return; }
    if (slots.some((s) => !s.date)) { setError("All slots must have a date"); return; }

    setError("");
    setLoading(true);
    try {
      await createDateRequestForUser({
        user_id: selectedUserId,
        group_size: groupSize,
        activity,
        availability_slots: slots,
      });
      router.push("/matching");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create date request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Create Date Request</h1>

      {error && <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Selection */}
        <section className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-200">Select User</h2>
          <input placeholder="Search by name or email..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-3 py-2" />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUsers.map((u) => (
              <button key={u.id} type="button" onClick={() => setSelectedUserId(u.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                  selectedUserId === u.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}>
                {u.first_name} {u.last_name} ({u.gender === "male" ? "M" : "F"}, {u.age}) — {u.email}
              </button>
            ))}
          </div>
          {selectedUser && (
            <p className="text-sm text-green-400">
              Selected: {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.gender})
            </p>
          )}
        </section>

        {/* Activity & Group Size */}
        <section className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-200">Date Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Activity</label>
              <select value={activity} onChange={(e) => setActivity(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2">
                {ACTIVITIES.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Group Size</label>
              <div className="flex gap-3 mt-1">
                {[4, 6].map((size) => (
                  <button key={size} type="button" onClick={() => setGroupSize(size)}
                    className={`px-6 py-2 rounded font-semibold transition ${
                      groupSize === size ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}>{size}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Availability Slots */}
        <section className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-200">Availability</h2>
          {slots.map((slot, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="date" value={slot.date} onChange={(e) => updateSlot(i, "date", e.target.value)}
                className="bg-gray-700 text-white rounded px-3 py-2 flex-1" />
              <select value={slot.time_window} onChange={(e) => updateSlot(i, "time_window", e.target.value)}
                className="bg-gray-700 text-white rounded px-3 py-2">
                {TIME_WINDOWS.map((tw) => <option key={tw} value={tw}>{tw}</option>)}
              </select>
              {slots.length > 1 && (
                <button type="button" onClick={() => removeSlot(i)} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addSlot} className="text-sm text-blue-400 hover:text-blue-300">+ Add slot</button>
        </section>

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition">
          {loading ? "Creating..." : "Create Date Request"}
        </button>
      </form>
    </div>
  );
}
