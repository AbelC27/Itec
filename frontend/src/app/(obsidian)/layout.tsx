"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import {
    Bug,
    ChevronLeft,
    ChevronRight,
    Code2,
    Home,
    LifeBuoy,
    LogOut,
    Plus,
    Settings,
    User,
} from "lucide-react";

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

const primaryNav: NavItem[] = [
    { href: "/homepage", label: "Home", icon: Home },
    { href: "/workspace", label: "Workspace", icon: Code2 },
    { href: "/debugging", label: "Debugging", icon: Bug },
    { href: "/profile", label: "Profile", icon: User },
];

const secondaryNav: NavItem[] = [
    { href: "#", label: "Settings", icon: Settings },
    { href: "#", label: "Support", icon: LifeBuoy },
];

export default function ObsidianLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("sidebar-collapsed") === "true";
    });

    useEffect(() => {
        localStorage.setItem("sidebar-collapsed", String(collapsed));
    }, [collapsed]);

    return (
        <div className="min-h-screen bg-background text-slate-100">
            <div className="flex min-h-screen">
                <aside
                    className={`hidden shrink-0 border-r border-white/10 bg-background lg:block transition-all duration-200 ${
                        collapsed ? "w-16" : "w-64"
                    }`}
                >
                    <div className="flex h-full flex-col px-3 py-6">
                        {/* Collapse toggle */}
                        <button
                            type="button"
                            onClick={() => setCollapsed((prev) => !prev)}
                            className="mb-4 flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-accent hover:text-accent-foreground transition-all duration-200"
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {collapsed ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <ChevronLeft className="h-4 w-4" />
                            )}
                        </button>

                        {/* Project info card */}
                        <div className="rounded-xl border border-white/10 bg-[#09090B] px-3 py-3">
                            {!collapsed && (
                                <>
                                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                        Project Alpha
                                    </p>
                                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                        Collaborative Mode
                                    </div>
                                </>
                            )}
                            {collapsed && (
                                <span className="flex justify-center">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                </span>
                            )}
                        </div>

                        {/* Primary navigation */}
                        <nav className="mt-6 space-y-1">
                            {primaryNav.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                                            isActive
                                                ? "bg-accent text-accent-foreground"
                                                : "text-slate-400 hover:bg-accent hover:text-accent-foreground"
                                        } ${collapsed ? "justify-center" : ""}`}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {!collapsed && item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Bottom section */}
                        <div className="mt-auto space-y-4">
                            <Button
                                variant="outline"
                                className={`w-full ${collapsed ? "px-0" : ""}`}
                                onClick={() => {}}
                            >
                                <Plus className="h-4 w-4 shrink-0" />
                                {!collapsed && (
                                    <span className="text-xs font-semibold uppercase tracking-[0.3em]">
                                        New Branch
                                    </span>
                                )}
                            </Button>
                            <div className="space-y-1">
                                {secondaryNav.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition-all duration-200 hover:bg-accent hover:text-accent-foreground ${
                                                collapsed ? "justify-center" : ""
                                            }`}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            {!collapsed && item.label}
                                        </Link>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const supabase = createClient();
                                        await supabase.auth.signOut();
                                        router.push("/");
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition-all duration-200 hover:bg-accent hover:text-destructive ${
                                        collapsed ? "justify-center" : ""
                                    }`}
                                >
                                    <LogOut className="h-4 w-4 shrink-0" />
                                    {!collapsed && "Log Out"}
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="flex min-h-screen flex-1 flex-col bg-background">
                    <main className="relative flex-1 px-6 py-6 lg:px-8">
                        <div className="relative">{children}</div>
                    </main>
                </div>
            </div>
        </div>
    );
}
