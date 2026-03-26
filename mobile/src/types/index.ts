export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  is_email_verified: boolean;
  is_selfie_verified: boolean;
  is_admin: boolean;
}

export interface PublicProfile {
  id: string;
  first_name: string;
  age: number;
  gender: string;
  program: string | null;
  year_of_study: number | null;
  bio: string | null;
  photo_urls: string[];
  interests: string[];
  is_selfie_verified: boolean;
}

export interface PrivateProfile extends PublicProfile {
  age_range_min: number | null;
  age_range_max: number | null;
}

export interface AvailabilitySlot {
  date: string;
  time_window?: TimeWindow;  // Legacy, still supported
  time_hours?: number[];     // [18, 19, 20, 21] — new format
}

export type TimeWindow = "morning" | "afternoon" | "evening" | "night";

export const TIME_WINDOW_HOURS: Record<TimeWindow, number[]> = {
  morning: [8, 9, 10, 11],
  afternoon: [12, 13, 14, 15, 16, 17],
  evening: [18, 19, 20, 21],
  night: [22, 23, 0, 1],
};

export type ActivityType =
  | "dinner"
  | "bar"
  | "bowling"
  | "karaoke"
  | "board_games"
  | "cooking_class"
  | "trivia_night"
  | "mini_golf"
  | "escape_room"
  | "arcade";

export const YUNI_AI_USER_ID = "00000000-0000-0000-0000-000000000001";

export interface VibeAnswer {
  question: string;
  answer: string;
}

export interface ProfileCreateData {
  onboarding_path?: string;
  program: string;
  year_of_study: number;
  relationship_intent?: string;
  photo_urls: string[];
  interests: string[];
  prompts?: { prompt: string; answer: string }[];
  vibe_answers?: VibeAnswer[];
  age_range_min: number;
  age_range_max: number;
  bio?: string;
  // Location
  latitude?: number;
  longitude?: number;
  preferred_max_distance_km?: number;
  // Self-description
  body_type?: string;
  height_cm?: number;
  style_tags?: string[];
  // Preferences about others
  pref_body_type?: string[];
  pref_height_range?: number[];
  pref_style?: string[];
  pref_social_energy_range?: number[];
  pref_humor_styles?: string[];
  pref_communication?: string[];
  // Thorough-only
  social_energy?: number;
  humor_styles?: string[];
  communication_pref?: string;
  conflict_style?: string;
  drinking?: string;
  smoking?: string;
  exercise?: string;
  diet?: string;
  sleep_schedule?: string;
  group_role?: string[];
  ideal_group_size?: string;
  dealbreakers?: string[];
  values_vector?: number[];
}

export interface ProfileUpdateData {
  program?: string;
  year_of_study?: number;
  relationship_intent?: string;
  photo_urls?: string[];
  interests?: string[];
  prompts?: { prompt: string; answer: string }[];
  age_range_min?: number;
  age_range_max?: number;
  bio?: string;
}

export interface DateRequestCreateData {
  group_size: number;
  activity: ActivityType;
  availability_slots: AvailabilitySlot[];
  pre_group_friend_ids?: string[];
}

export interface DateRequest {
  id: string;
  user_id: string;
  group_size: number;
  activity: ActivityType;
  status: string;
  availability_slots: AvailabilitySlot[];
  pre_group_friend_ids: string[];
  created_at: string;
}

export interface DateGroup {
  id: string;
  activity: ActivityType;
  scheduled_date: string;
  scheduled_time: string;
  venue_name: string | null;
  venue_address: string | null;
  status: string;
  members: PublicProfile[];
}

export interface Match {
  id: string;
  partner: PublicProfile;
  chat_room_id: string;
  group_id: string;
  created_at: string;
}

export interface ParticipantInfo {
  user_id: string;
  first_name: string;
}

export interface LastMessage {
  content: string;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  room_type: "group" | "1v1";
  last_message: LastMessage | null;
  group_id: string | null;
  participants: ParticipantInfo[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id?: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type?: string;
  created_at: string;
}

export interface GroupMemberProfile {
  id: string;
  first_name: string;
  age: number;
  gender: string;
  bio: string | null;
  interests: string[];
  photo_urls: string[];
  program: string | null;
  is_selfie_verified: boolean;
}

export interface GroupMember {
  user_id: string;
  profile: GroupMemberProfile;
}

export interface GroupDetail {
  id: string;
  activity: string;
  scheduled_date: string;
  scheduled_time: string;
  venue_name: string | null;
  venue_address: string | null;
  status: string;
  members: GroupMember[];
  chat_room_id: string | null;
}

export interface IcebreakersResponse {
  prompts: string[];
}

export interface Venue {
  name: string;
  address: string;
  neighborhood: string;
  price_range: string;
}

export interface VenuesResponse {
  activity: string;
  venues: Venue[];
}

export interface RomanticInterestInput {
  user_id: string;
  interested: boolean;
}

export interface FeedbackCreateData {
  experience_rating: number;
  romantic_interests: RomanticInterestInput[];
  block_user_ids: string[];
  report_user_ids: string[];
  report_category?: string;
}

export interface FeedbackResponse {
  id: string;
  group_id: string;
  experience_rating: number;
  submitted_at: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  gender: string;
  age: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  otp?: string;
}
