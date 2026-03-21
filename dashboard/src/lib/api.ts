const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res;
}

async function fetchJson<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchApi(path, options);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
  const data = await fetchJson<{ access_token: string; token_type: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (typeof window !== "undefined") {
    localStorage.setItem("admin_token", data.access_token);
  }
  return data;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin_token");
  }
}

export interface UsersParams {
  search?: string;
  gender?: string;
  is_suspended?: boolean;
  limit?: number;
  offset?: number;
}

export async function getUsers(params?: UsersParams) {
  const query = new URLSearchParams();
  if (params) {
    if (params.search) query.set("search", params.search);
    if (params.gender) query.set("gender", params.gender);
    if (params.is_suspended !== undefined) query.set("is_suspended", String(params.is_suspended));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
  }
  const qs = query.toString();
  return fetchJson<{ users: AdminUserSummary[]; total: number }>(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

export async function getUserDetail(id: string) {
  return fetchJson<AdminUserDetail>(`/api/admin/users/${id}`);
}

export async function updateUser(id: string, data: { is_suspended?: boolean; is_admin?: boolean }) {
  return fetchJson<AdminUserDetail>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getPendingRequests() {
  return fetchJson<PendingDateRequest[]>("/api/admin/date-requests/pending");
}

export async function createManualGroup(data: {
  user_ids: string[];
  activity: string;
  scheduled_date: string;
  scheduled_time: string;
}) {
  return fetchJson<DateGroupResponse>("/api/admin/matching/manual", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function runBatchMatching() {
  return fetchJson<{ groups_formed: number; groups: DateGroupResponse[] }>("/api/admin/matching/run-batch", {
    method: "POST",
  });
}

export interface ReportsParams {
  status?: string;
  limit?: number;
  offset?: number;
}

export async function getReports(params?: ReportsParams) {
  const query = new URLSearchParams();
  if (params) {
    if (params.status) query.set("status", params.status);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
  }
  const qs = query.toString();
  return fetchJson<ReportResponse[]>(`/api/admin/reports${qs ? `?${qs}` : ""}`);
}

export async function updateReport(id: string, data: { status: string; admin_notes?: string }) {
  return fetchJson<ReportResponse>(`/api/admin/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getAnalytics() {
  return fetchJson<AnalyticsResponse>("/api/admin/analytics");
}

export async function triggerNoshowCheck() {
  return fetchJson<NoshowUser[]>("/api/admin/noshow-check", { method: "POST" });
}

export async function seedDatabase() {
  return fetchJson<{ detail: string }>("/api/admin/seed", { method: "POST" });
}

// Types

export interface AdminUserSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  is_email_verified: boolean;
  is_selfie_verified: boolean;
  is_suspended: boolean;
  no_show_count: number;
  created_at: string;
  total_groups: number;
  total_matches: number;
}

export interface AdminGroupSummary {
  id: string;
  activity: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  created_at: string;
}

export interface AdminMatchSummary {
  id: string;
  partner_id: string;
  partner_name: string;
  group_id: string;
  created_at: string;
}

export interface AdminReportSummary {
  id: string;
  other_user_id: string;
  other_user_name: string;
  category: string;
  status: string;
  direction: "filed" | "received";
  created_at: string;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  phone?: string;
  university_domain: string;
  program?: string;
  year_of_study?: number;
  bio?: string;
  interests: string[];
  is_email_verified: boolean;
  is_selfie_verified: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  no_show_count: number;
  created_at: string;
  updated_at: string;
  groups: AdminGroupSummary[];
  matches: AdminMatchSummary[];
  reports: AdminReportSummary[];
}

export interface PendingRequestUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  program?: string;
  interests: string[];
}

export interface PendingDateRequest {
  id: string;
  user_id: string;
  group_size: number;
  activity: string;
  status: string;
  created_at: string;
  user: PendingRequestUser;
}

export interface DateGroupResponse {
  id: string;
  activity: string;
  scheduled_date: string;
  scheduled_time: string;
  venue_name?: string;
  venue_address?: string;
  status: string;
  members: GroupMemberResponse[];
  created_at: string;
}

export interface GroupMemberResponse {
  id: string;
  user_id: string;
  first_name: string;
  age: number;
  gender: string;
  program?: string;
  bio?: string;
  photo_urls: string[];
  interests: string[];
  is_selfie_verified: boolean;
}

export interface ReportResponse {
  id: string;
  reporter_id: string;
  reported_id: string;
  group_id?: string;
  category: string;
  description?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsResponse {
  total_users: number;
  active_users: number;
  total_groups: number;
  total_matches: number;
  avg_experience_rating?: number;
  total_reports_pending: number;
  no_show_count_total: number;
}

export interface NoshowUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  no_show_count: number;
  is_suspended: boolean;
}
