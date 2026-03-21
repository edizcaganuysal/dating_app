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
  | "coffee"
  | "bowling"
  | "hiking"
  | "board_games"
  | "cooking_class"
  | "trivia_night"
  | "karaoke"
  | "escape_room"
  | "mini_golf"
  | "art_class";

export interface DateRequest {
  id: string;
  user_id: string;
  group_size: number;
  activity: ActivityType;
  status: string;
  availability_slots: AvailabilitySlot[];
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
