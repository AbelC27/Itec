export type UserRole = "student" | "teacher";

export interface Profile {
  id: string;
  username: string;
  avatar_color_hex: string;
  role: UserRole;
  status: "online" | "offline" | "away" | "busy";
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  language: string;
  content?: string | null;
  content_version?: number | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}
