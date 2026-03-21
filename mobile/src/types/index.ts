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
  time_window: TimeWindow;
}

export type TimeWindow = "morning" | "afternoon" | "evening" | "night";

export type ActivityType =
  | "dinner"
  | "bar"
  | "bowling"
  | "karaoke"
  | "board_games"
  | "ice_skating"
  | "hiking"
  | "cooking_class"
  | "trivia_night"
  | "mini_golf"
  | "escape_room"
  | "art_gallery"
  | "picnic"
  | "museum";

export interface VibeAnswer {
  question: string;
  answer: string;
}

export interface ProfileCreateData {
  bio: string;
  program: string;
  year_of_study: number;
  photo_urls: string[];
  interests: string[];
  vibe_answers: VibeAnswer[];
  age_range_min: number;
  age_range_max: number;
}

export interface ProfileUpdateData {
  bio?: string;
  program?: string;
  year_of_study?: number;
  photo_urls?: string[];
  interests?: string[];
  age_range_min?: number;
  age_range_max?: number;
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

export interface ChatRoom {
  id: string;
  room_type: "group" | "one_on_one";
  last_message: string | null;
  group_id: string | null;
  participants: PublicProfile[];
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
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
