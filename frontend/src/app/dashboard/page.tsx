import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    profile = data as Profile | null;
  }

  // Fallback state when profile is missing
  if (!profile) {
    return (
      <div>
        <h1
          className="text-2xl font-semibold mb-6"
          style={{ color: "var(--foreground)" }}
        >
          Welcome to iTECify
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Your profile is being set up. Please refresh the page in a moment.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1
        className="text-2xl font-semibold mb-8"
        style={{ color: "var(--foreground)" }}
      >
        Welcome back, {profile.username}
      </h1>

      {/* Create new project placeholder */}
      <button
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
        style={{
          backgroundColor: "var(--accent)",
          color: "#ffffff",
          borderRadius: "var(--radius-input)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 3V13M3 8H13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Create New Sandbox/Project
      </button>

      {/* Projects section */}
      <div className="mt-8">
        <h2
          className="text-lg font-medium mb-4"
          style={{ color: "var(--foreground)" }}
        >
          Your Projects
        </h2>
        <div
          className="flex items-center justify-center py-12 border border-dashed"
          style={{
            borderColor: "var(--border)",
            borderRadius: "var(--radius-card)",
            color: "var(--text-secondary)",
          }}
        >
          <p className="text-sm">No projects yet</p>
        </div>
      </div>
    </div>
  );
}
