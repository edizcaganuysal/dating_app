import { getUsers, createManualGroup } from "@/lib/api";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const storage: Record<string, string> = { admin_token: "test-token" };
Object.defineProperty(global, "localStorage", {
  value: {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
  },
});

beforeEach(() => {
  mockFetch.mockReset();
});

describe("getUsers", () => {
  it("calls GET /api/admin/users", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ users: [], total: 0 }),
    });

    const result = await getUsers();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/admin/users");
    expect(options.method).toBeUndefined();
    expect(options.headers["Authorization"]).toBe("Bearer test-token");
    expect(result).toEqual({ users: [], total: 0 });
  });

  it("passes search params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ users: [], total: 0 }),
    });

    await getUsers({ search: "alice", gender: "female", limit: 10 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("search=alice");
    expect(url).toContain("gender=female");
    expect(url).toContain("limit=10");
  });
});

describe("createManualGroup", () => {
  it("sends POST with correct payload", async () => {
    const payload = {
      user_ids: ["id-1", "id-2", "id-3", "id-4"],
      activity: "Coffee",
      scheduled_date: "2026-04-01",
      scheduled_time: "14:00",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "group-1", ...payload }),
    });

    await createManualGroup(payload);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/admin/matching/manual");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(payload);
  });
});
