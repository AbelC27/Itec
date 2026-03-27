"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";

const navItems = [
  { label: "Home", href: "/dashboard", icon: HomeIcon },
  { label: "Projects", href: "/dashboard/projects", icon: ProjectsIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
      });
  }, [user]);

  async function handleSignOut() {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className="flex flex-col w-60 border-r"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            iTECify
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors"
                style={{
                  borderRadius: "var(--radius-input)",
                  color: isActive ? "var(--foreground)" : "var(--text-secondary)",
                  backgroundColor: isActive ? "var(--border)" : "transparent",
                }}
              >
                <item.icon />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile section */}
        <div
          className="px-3 py-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3 px-3 py-2">
            {/* Avatar circle */}
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium"
              style={{
                backgroundColor: profile?.avatar_color_hex ?? "var(--accent)",
                color: "#ffffff",
              }}
            >
              {(profile?.username ?? user?.email ?? "?")[0].toUpperCase()}
            </div>
            <span
              className="text-sm truncate"
              style={{ color: "var(--foreground)" }}
            >
              {profile?.username ?? user?.email ?? "User"}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="flex items-center gap-2 w-full px-3 py-2 mt-1 text-sm transition-colors cursor-pointer disabled:opacity-50"
            style={{
              borderRadius: "var(--radius-input)",
              color: "var(--text-secondary)",
            }}
          >
            {isLoggingOut ? "Logging out…" : "Log Out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto p-8"
        style={{ backgroundColor: "var(--background)" }}
      >
        {children}
      </main>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 6L8 1.5L14 6V13.5C14 13.7652 13.8946 14.0196 13.7071 14.2071C13.5196 14.3946 13.2652 14.5 13 14.5H3C2.73478 14.5 2.48043 14.3946 2.29289 14.2071C2.10536 14.0196 2 13.7652 2 13.5V6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 14.5V8H10V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 10V13C14 13.2652 13.8946 13.5196 13.7071 13.7071C13.5196 13.8946 13.2652 14 13 14H3C2.73478 14 2.48043 13.8946 2.29289 13.7071C2.10536 13.5196 2 13.2652 2 13V3C2 2.73478 2.10536 2.48043 2.29289 2.29289C2.48043 2.10536 2.73478 2 3 2H6L7.5 4H13C13.2652 4 13.5196 4.10536 13.7071 4.29289C13.8946 4.48043 14 4.73478 14 5V10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
