"use client";

import { useEffect, useState } from "react";
import { getPendingSelfies, reviewSelfie, SelfieReview } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SelfieReviewPage() {
  const [reviews, setReviews] = useState<SelfieReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadReviews = () => {
    setLoading(true);
    getPendingSelfies()
      .then(setReviews)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReviews(); }, []);

  const handleReview = async (userId: string, action: "approve" | "reject") => {
    setActionLoading(userId);
    try {
      await reviewSelfie(userId, action);
      setReviews((prev) => prev.filter((r) => r.id !== userId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Selfie Verification Review</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {reviews.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-lg">No pending selfie reviews</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((r) => (
            <div key={r.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{r.first_name} {r.last_name}</h2>
                  <p className="text-gray-400 text-sm">{r.email}</p>
                </div>
                <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 rounded-full text-sm">Pending</span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Profile Photos */}
                <div>
                  <p className="text-gray-400 text-sm mb-2 font-semibold">Profile Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {(r.photo_urls || []).slice(0, 4).map((url, i) => (
                      <img
                        key={i}
                        src={url.startsWith("/") ? `${API_BASE}${url}` : url}
                        alt={`Profile ${i + 1}`}
                        className="w-24 h-30 object-cover rounded-lg border border-gray-700"
                      />
                    ))}
                  </div>
                </div>

                {/* Selfie Photos */}
                <div>
                  <p className="text-gray-400 text-sm mb-2 font-semibold">Selfie Verification Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {(r.selfie_urls || []).map((url, i) => (
                      <img
                        key={i}
                        src={url.startsWith("/") ? `${API_BASE}${url}` : url}
                        alt={`Selfie ${i + 1}`}
                        className="w-24 h-30 object-cover rounded-lg border-2 border-purple-500"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handleReview(r.id, "approve")}
                  disabled={actionLoading === r.id}
                  className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {actionLoading === r.id ? "..." : "Approve"}
                </button>
                <button
                  onClick={() => handleReview(r.id, "reject")}
                  disabled={actionLoading === r.id}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {actionLoading === r.id ? "..." : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
