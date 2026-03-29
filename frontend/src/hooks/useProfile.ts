"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/types/database";

type ProfileIdentity = Pick<
  Profile,
  "id" | "username" | "avatar_color_hex" | "role" | "status" | "created_at" | "updated_at"
>;

type ProfileUpdatePayload = Partial<
  Pick<ProfileIdentity, "username" | "avatar_color_hex" | "status">
>;

interface UseProfileReturn {
  profile: ProfileIdentity | null;
  isLoading: boolean;
  isUpdating: boolean;
  updateProfile: (updates: ProfileUpdatePayload) => Promise<{ error: string | null }>;
}

export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const [profile, setProfile] = useState<ProfileIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!userId) {
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
          .select("id, username, avatar_color_hex, role, status, created_at, updated_at")
          .eq("id", user!.id)
          .single();

        if (cancelled) return;

        const fallbackRole: UserRole = "student";

        if (error || !data) {
          // Fallback identity on network error or missing row
          setProfile({
            id: userId,
            username: userEmail ?? userId,
            avatar_color_hex: "#6B7280",
            role: fallbackRole,
            status: "online",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } else {
          const role: UserRole =
            data.role === "teacher" || data.role === "student" ? data.role : fallbackRole;
          setProfile({
            id: data.id,
            username: data.username,
            avatar_color_hex: data.avatar_color_hex,
            role,
            status:
              data.status === "online" ||
              data.status === "offline" ||
              data.status === "away" ||
              data.status === "busy"
                ? data.status
                : "online",
            created_at: data.created_at,
            updated_at: data.updated_at,
          });
        }
      } catch {
        if (cancelled) return;
        // Fallback identity on unexpected errors
        setProfile({
          id: userId,
          username: userEmail ?? userId,
          avatar_color_hex: "#6B7280",
          role: "student",
          status: "online",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
  }, [userEmail, userId]);

  async function updateProfile(updates: ProfileUpdatePayload): Promise<{ error: string | null }> {
    if (!user) {
      return { error: "Not authenticated" };
    }

    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select("id, username, avatar_color_hex, role, status, created_at, updated_at")
        .single();

      if (error || !data) {
        return { error: error?.message ?? "Could not update profile" };
      }

      const role: UserRole =
        data.role === "teacher" || data.role === "student" ? data.role : "student";

      setProfile({
        id: data.id,
        username: data.username,
        avatar_color_hex: data.avatar_color_hex,
        role,
        status:
          data.status === "online" ||
          data.status === "offline" ||
          data.status === "away" ||
          data.status === "busy"
            ? data.status
            : "online",
        created_at: data.created_at,
        updated_at: data.updated_at,
      });

      return { error: null };
    } catch {
      return { error: "Unexpected error updating profile" };
    } finally {
      setIsUpdating(false);
    }
  }

  return { profile, isLoading, isUpdating, updateProfile };
}
