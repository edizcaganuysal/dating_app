const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface WaitlistPayload {
  name: string;
  email: string;
  university: string;
}

interface WaitlistResponse {
  message: string;
  position: number;
}

interface WaitlistCountResponse {
  count: number;
}

export async function joinWaitlist(
  data: WaitlistPayload
): Promise<WaitlistResponse> {
  const res = await fetch(`${BASE_URL}/api/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.detail || "Something went wrong");
  }

  return body;
}

const PAPER_SIGNUPS = 150;

export async function getWaitlistCount(): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/api/waitlist/count`);
    if (!res.ok) return PAPER_SIGNUPS;
    const body: WaitlistCountResponse = await res.json();
    return body.count + PAPER_SIGNUPS;
  } catch {
    return PAPER_SIGNUPS;
  }
}
