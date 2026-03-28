export interface Profile {
  id: string;
  username: string;
  avatar_color_hex: string;
  status: "online" | "offline" | "away" | "busy";
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  language: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}
