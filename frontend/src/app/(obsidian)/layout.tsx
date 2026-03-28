"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LucideIcon } from "lucide-react";
import {
    Bug,
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
    { href: "/assistant", label: "Profile", icon: User },
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="flex min-h-screen">
                <aside className="hidden w-64 shrink-0 border-r border-slate-900 bg-slate-950/95 lg:block">
                    <div className="flex h-full flex-col px-5 py-6">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                Project Alpha
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                Collaborative Mode
                            </div>
                        </div>
                        <nav className="mt-6 space-y-1">
                            {primaryNav.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive
                                            ? "bg-blue-950/70 text-blue-100"
                                            : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="mt-auto space-y-4">
                            <button
                                type="button"
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-900/60 bg-blue-950/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-blue-100 transition hover:bg-blue-900/60"
                            >
                                <Plus className="h-4 w-4" />
                                New Branch
                            </button>
                            <div className="space-y-1">
                                {secondaryNav.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition hover:bg-slate-900/60 hover:text-slate-200"
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.label}
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
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition hover:bg-slate-900/60 hover:text-red-300"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="flex min-h-screen flex-1 flex-col">
                    <main className="relative flex-1 px-6 py-6 lg:px-8">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(30,58,138,0.22),_transparent_55%)]"
                        />
                        <div className="relative">{children}</div>
                    </main>
                </div>
            </div>
        </div>
    );
}
