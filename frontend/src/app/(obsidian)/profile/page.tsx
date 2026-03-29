"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Clock3, GraduationCap, Mail, Palette, Shield, User } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useProfile } from "@/hooks/useProfile";

const PRESET_AVATAR_COLORS = [
    "#0f172a",
    "#1d4ed8",
    "#0f766e",
    "#166534",
    "#be123c",
    "#7c3aed",
    "#854d0e",
    "#334155",
];

export default function ProfilePage() {
    const { user } = useAuth();
    const { profile, isLoading, isUpdating, updateProfile } = useProfile();
    const displayName = profile?.username ?? user?.email ?? "Unknown";
    const avatarInitial = displayName[0]?.toUpperCase() ?? "?";
    const avatarColor = profile?.avatar_color_hex ?? "#0f172a";
    const [pendingAvatarColor, setPendingAvatarColor] = useState(avatarColor);
    const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

    useEffect(() => {
        setPendingAvatarColor(avatarColor);
    }, [avatarColor]);

    const role = profile?.role ?? "student";
    const roleContent =
        role === "teacher"
            ? {
                  title: "Teacher Workspace",
                  description:
                      "You can guide learners, review code sessions, and prioritize intervention moments.",
                  items: [
                      "Review active learner sessions from Workspace.",
                      "Use AI hints as coaching prompts, not complete solutions.",
                      "Track execution status to spot blocked students quickly.",
                  ],
                  icon: BookOpen,
              }
            : {
                  title: "Student Workspace",
                  description:
                      "You can practice in guided mode, save your progress, and get context-aware tutoring support.",
                  items: [
                      "Use Workspace to iterate safely before submitting code.",
                      "Ask the AI tutor for explanations when a run fails.",
                      "Check your history often to spot recurring mistakes.",
                  ],
                  icon: GraduationCap,
              };

    const memberSince = useMemo(() => {
        if (!profile?.created_at) return "Not available";
        const created = new Date(profile.created_at);
        if (Number.isNaN(created.getTime())) return "Not available";
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(created);
    }, [profile?.created_at]);

    const lastUpdated = useMemo(() => {
        if (!profile?.updated_at) return "Not available";
        const updated = new Date(profile.updated_at);
        if (Number.isNaN(updated.getTime())) return "Not available";
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(updated);
    }, [profile?.updated_at]);

    async function handleSaveAvatarColor() {
        setSaveFeedback(null);
        if (!/^#[0-9A-Fa-f]{6}$/.test(pendingAvatarColor)) {
            setSaveFeedback("Use a valid hex color like #1d4ed8.");
            return;
        }

        const { error } = await updateProfile({ avatar_color_hex: pendingAvatarColor });
        setSaveFeedback(error ? `Could not save color: ${error}` : "Avatar color updated.");
    }

    return (
        <section className="space-y-6">
            <header className="rounded-2xl border border-border bg-card p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                    Profile
                </p>
                <h1 className="mt-3 text-2xl font-semibold text-foreground">
                    Account Overview
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Manage your profile details and account settings.
                </p>
            </header>

            <section className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <User className="h-4 w-4 text-blue-300" />
                    Profile Details
                </div>
                <div className="mt-4">
                    {isLoading ? (
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Loading profile...
                        </p>
                    ) : profile || user ? (
                        <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                            <div
                                className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border text-2xl font-semibold text-foreground"
                                style={{ backgroundColor: pendingAvatarColor }}
                                aria-label="Profile avatar"
                            >
                                {avatarInitial}
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                    <User className="h-3.5 w-3.5" />
                                    <span>Username</span>
                                </div>
                                <p className="text-sm text-foreground">
                                    {profile?.username ?? "Not set"}
                                </p>
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span>Email</span>
                                </div>
                                <p className="text-sm text-foreground">
                                    {user?.email ?? "Not available"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            No profile data yet.
                        </p>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <Palette className="h-4 w-4 text-blue-300" />
                    Avatar Color
                </div>
                <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            type="color"
                            value={pendingAvatarColor}
                            onChange={(event) => setPendingAvatarColor(event.target.value)}
                            className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
                            aria-label="Choose avatar color"
                        />
                        <input
                            type="text"
                            value={pendingAvatarColor}
                            onChange={(event) => setPendingAvatarColor(event.target.value)}
                            className="h-10 w-36 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                            placeholder="#0f172a"
                            maxLength={7}
                            aria-label="Avatar color hex"
                        />
                        <button
                            type="button"
                            onClick={handleSaveAvatarColor}
                            disabled={isUpdating}
                            className="inline-flex h-10 items-center rounded-lg border border-border bg-secondary px-4 text-sm font-medium text-foreground transition hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isUpdating ? "Saving..." : "Save Color"}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_AVATAR_COLORS.map((hex) => (
                            <button
                                key={hex}
                                type="button"
                                onClick={() => setPendingAvatarColor(hex)}
                                className="h-8 w-8 rounded-full border border-border"
                                style={{ backgroundColor: hex }}
                                aria-label={`Use ${hex} as avatar color`}
                            />
                        ))}
                    </div>
                    {saveFeedback ? (
                        <p className="text-xs text-muted-foreground">{saveFeedback}</p>
                    ) : null}
                </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <Shield className="h-4 w-4 text-blue-300" />
                    Account Details
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-secondary/50 p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            Role
                        </div>
                        <p className="mt-2 text-sm capitalize text-foreground">{role}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/50 p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            Account Status
                        </div>
                        <p className="mt-2 text-sm capitalize text-foreground">
                            {profile?.status ?? "Not available"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/50 p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            Member Since
                        </div>
                        <p className="mt-2 text-sm text-foreground">{memberSince}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/50 p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            Last Profile Update
                        </div>
                        <p className="mt-2 text-sm text-foreground">{lastUpdated}</p>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <roleContent.icon className="h-4 w-4 text-blue-300" />
                    {roleContent.title}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{roleContent.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-foreground">
                    {roleContent.items.map((item) => (
                        <li key={item} className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
                            {item}
                        </li>
                    ))}
                </ul>
            </section>
        </section>
    );
}
