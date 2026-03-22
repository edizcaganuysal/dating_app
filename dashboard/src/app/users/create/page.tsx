"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/lib/api";

const INTERESTS = [
  "hiking", "cooking", "reading", "gaming", "photography", "music",
  "travel", "fitness", "art", "movies", "dancing", "coffee",
  "food", "sports", "yoga", "volunteering",
];

const VIBE_QUESTIONS = [
  { question: "What's your ideal Friday night?", options: ["House party", "Cozy bar"] },
  { question: "Pick a superpower:", options: ["Teleportation", "Mind reading"] },
  { question: "What's your coffee order?", options: ["Black coffee", "Fancy latte"] },
  { question: "How do you handle stress?", options: ["Exercise", "Netflix"] },
  { question: "What's your love language?", options: ["Quality time", "Words of affirmation"] },
];

export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "password123",
    first_name: "",
    last_name: "",
    phone: "",
    gender: "male",
    age: 20,
    program: "",
    year_of_study: 2,
    bio: "",
    photo_urls: ["https://picsum.photos/seed/1/400/500", "https://picsum.photos/seed/2/400/500", "https://picsum.photos/seed/3/400/500"],
    interests: [] as string[],
    age_range_min: 18,
    age_range_max: 25,
  });

  const [vibeAnswers, setVibeAnswers] = useState<string[]>(VIBE_QUESTIONS.map(() => ""));

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const toggleInterest = (interest: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const vibe_answers = VIBE_QUESTIONS.map((q, i) => ({
        question: q.question,
        answer: vibeAnswers[i] || q.options[0],
      }));
      const user = await createUser({ ...form, vibe_answers });
      router.push(`/users/${user.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Create User</h1>

      {error && <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <section className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-200">Personal Info</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="First name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required className="bg-gray-700 text-white rounded px-3 py-2" />
            <input placeholder="Last name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required className="bg-gray-700 text-white rounded px-3 py-2" />
          </div>
          <input placeholder="Email (e.g. jane.doe@mail.utoronto.ca)" value={form.email} onChange={(e) => set("email", e.target.value)} required className="w-full bg-gray-700 text-white rounded px-3 py-2" />
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="Password" value={form.password} onChange={(e) => set("password", e.target.value)} required className="bg-gray-700 text-white rounded px-3 py-2" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="bg-gray-700 text-white rounded px-3 py-2" />
            <input type="number" placeholder="Age" value={form.age} onChange={(e) => set("age", Number(e.target.value))} min={18} max={99} required className="bg-gray-700 text-white rounded px-3 py-2" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-gray-300">
              <input type="radio" name="gender" value="male" checked={form.gender === "male"} onChange={() => set("gender", "male")} /> Male
            </label>
            <label className="flex items-center gap-2 text-gray-300">
              <input type="radio" name="gender" value="female" checked={form.gender === "female"} onChange={() => set("gender", "female")} /> Female
            </label>
          </div>
        </section>

        {/* Profile */}
        <section className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-200">Profile</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Program (e.g. Computer Science)" value={form.program} onChange={(e) => set("program", e.target.value)} className="bg-gray-700 text-white rounded px-3 py-2" />
            <select value={form.year_of_study} onChange={(e) => set("year_of_study", Number(e.target.value))} className="bg-gray-700 text-white rounded px-3 py-2">
              {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <textarea placeholder="Bio (max 500 chars)" value={form.bio} onChange={(e) => set("bio", e.target.value)} maxLength={500} rows={3} className="w-full bg-gray-700 text-white rounded px-3 py-2" />
        </section>

        {/* Photos */}
        <section className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-200">Photos (min 3 URLs)</h2>
          {form.photo_urls.map((url, i) => (
            <input key={i} placeholder={`Photo URL ${i + 1}`} value={url}
              onChange={(e) => { const urls = [...form.photo_urls]; urls[i] = e.target.value; set("photo_urls", urls); }}
              className="w-full bg-gray-700 text-white rounded px-3 py-2" />
          ))}
          {form.photo_urls.length < 6 && (
            <button type="button" onClick={() => set("photo_urls", [...form.photo_urls, `https://picsum.photos/seed/${form.photo_urls.length + 1}/400/500`])}
              className="text-sm text-blue-400 hover:text-blue-300">+ Add photo</button>
          )}
        </section>

        {/* Interests */}
        <section className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-200">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  form.interests.includes(interest) ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-400"
                }`}>{interest}</button>
            ))}
          </div>
        </section>

        {/* Vibe Check */}
        <section className="bg-gray-800 rounded-lg p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-200">Vibe Check</h2>
          {VIBE_QUESTIONS.map((q, i) => (
            <div key={i}>
              <p className="text-gray-300 text-sm mb-1">{q.question}</p>
              <div className="flex gap-3">
                {q.options.map((opt) => (
                  <label key={opt} className="flex items-center gap-1 text-gray-400 text-sm">
                    <input type="radio" name={`vibe-${i}`} value={opt} checked={vibeAnswers[i] === opt}
                      onChange={() => { const a = [...vibeAnswers]; a[i] = opt; setVibeAnswers(a); }} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Preferences */}
        <section className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-200">Preferences (Private)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm">Min Age: {form.age_range_min}</label>
              <input type="range" min={18} max={40} value={form.age_range_min} onChange={(e) => set("age_range_min", Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-gray-400 text-sm">Max Age: {form.age_range_max}</label>
              <input type="range" min={18} max={40} value={form.age_range_max} onChange={(e) => set("age_range_max", Number(e.target.value))} className="w-full" />
            </div>
          </div>
        </section>

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition">
          {loading ? "Creating..." : "Create User"}
        </button>
      </form>
    </div>
  );
}
