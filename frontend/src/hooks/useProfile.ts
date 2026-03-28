"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/types/database";

type ProfileIdentity = Pick<Profile, "id" | "username" | "avatar_color_hex" | "role">;

interface UseProfileReturn {
  profile: ProfileIdentity | null;
  isLoading: boolean;
}

export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProfile() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_color_hex, role")
          .eq("id", user!.id)
          .single();

        if (cancelled) return;

        const fallbackRole: UserRole = "student";

        if (error || !data) {
          // Fallback identity on network error or missing row
          setProfile({
            id: user!.id,
            username: user!.email ?? user!.id,
            avatar_color_hex: "#6B7280",
            role: fallbackRole,
          });
        } else {
          const role: UserRole =
            data.role === "teacher" || data.role === "student" ? data.role : fallbackRole;
          setProfile({
            id: data.id,
            username: data.username,
            avatar_color_hex: data.avatar_color_hex,
            role,
          });
        }
      } catch {
        if (cancelled) return;
        // Fallback identity on unexpected errors
        setProfile({
          id: user!.id,
          username: user!.email ?? user!.id,
          avatar_color_hex: "#6B7280",
          role: "student",
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    setIsLoading(true);
    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { profile, isLoading };
}
