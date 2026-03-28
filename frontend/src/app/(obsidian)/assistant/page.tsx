"use client";

import { Mail, Palette, Shield, User } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useProfile } from "@/hooks/useProfile";

export default function ProfilePage() {
    const { user } = useAuth();
    const { profile, isLoading } = useProfile();
    const displayName = profile?.username ?? user?.email ?? "Unknown";
    const avatarInitial = displayName[0]?.toUpperCase() ?? "?";
    const avatarColor = profile?.avatar_color_hex ?? "#0f172a";

    return (
        <section className="space-y-6">
            <header className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                    Profile
                </p>
                <h1 className="mt-3 text-2xl font-semibold text-slate-100">
                    Account Overview
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                    Manage your profile details and account settings.
                </p>
            </header>

            <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    <User className="h-4 w-4 text-blue-300" />
                    Profile Details
                </div>
                <div className="mt-4">
                    {isLoading ? (
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Loading profile...
                        </p>
                    ) : profile || user ? (
                        <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                            <div
                                className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-800 text-2xl font-semibold text-slate-100"
                                style={{ backgroundColor: avatarColor }}
                                aria-label="Profile avatar"
                            >
                                {avatarInitial}
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                                    <User className="h-3.5 w-3.5" />
                                    <span>Username</span>
                                </div>
                                <p className="text-sm text-slate-100">
                                    {profile?.username ?? "Not set"}
                                </p>
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span>Email</span>
                                </div>
                                <p className="text-sm text-slate-100">
                                    {user?.email ?? "Not available"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            No profile data yet.
                        </p>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    <Shield className="h-4 w-4 text-blue-300" />
                    Account Details
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                            <Shield className="h-3.5 w-3.5" />
                            User ID
                        </div>
                        <p className="mt-2 text-sm text-slate-100">
                            {profile?.id ?? user?.id ?? "Not available"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                            <Palette className="h-3.5 w-3.5" />
                            Avatar Color
                        </div>
                        <p className="mt-2 text-sm text-slate-100">
                            {profile?.avatar_color_hex ?? "Not set"}
                        </p>
                    </div>
                </div>
            </section>
        </section>
    );
}
