"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
    Bot,
    Bug,
    ChevronRight,
    Code2,
    Home,
    LifeBuoy,
    Plus,
    Search,
    Settings,
} from "lucide-react";

type SystemStat = {
    label: string;
    value: string;
    usage: number;
};

const systemStats: SystemStat[] = [
    { label: "CPU", value: "18%", usage: 0.18 },
    { label: "RAM", value: "1.7/2.0", usage: 0.85 },
];

const userAvatars = ["A", "J", "M"];

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

const primaryNav: NavItem[] = [
    { href: "/homepage", label: "Home", icon: Home },
    { href: "/workspace", label: "Workspace", icon: Code2 },
    { href: "/debugging", label: "Debugging", icon: Bug },
    { href: "/assistant", label: "AI Assistant", icon: Bot },
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
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="flex min-h-screen flex-1 flex-col">
                    <header className="sticky top-0 z-20 border-b border-slate-900 bg-slate-950/80 backdrop-blur">
                        <div className="flex items-center justify-between gap-4 px-6 py-4 lg:px-8">
                            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
                                <span className="text-blue-200">Obsidian IDE</span>
                                <ChevronRight className="h-3 w-3" />
                                <span>Breadcrumbs</span>
                                <ChevronRight className="h-3 w-3" />
                                <span className="text-slate-200">Project Title</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="hidden items-center gap-3 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-400 md:flex">
                                    <Search className="h-4 w-4" />
                                    <span>Search...</span>
                                </div>
                                <div className="hidden items-center gap-3 lg:flex">
                                    {systemStats.map((stat) => (
                                        <div
                                            key={stat.label}
                                            className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-slate-400"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{stat.label}</span>
                                                <span className="text-slate-200">
                                                    {stat.value}
                                                </span>
                                            </div>
                                            <div className="mt-1 h-1 w-16 rounded-full bg-slate-800">
                                                <div
                                                    className="h-full rounded-full bg-blue-600"
                                                    style={{ width: `${stat.usage * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden items-center -space-x-2 lg:flex">
                                    {userAvatars.map((initial, index) => (
                                        <div
                                            key={`${initial}-${index}`}
                                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-[10px] font-semibold text-slate-200"
                                        >
                                            {initial}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="rounded-full border border-blue-900/70 bg-blue-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-blue-100 transition hover:bg-blue-900/60"
                                >
                                    Review by Peer
                                </button>
                            </div>
                        </div>
                    </header>

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
