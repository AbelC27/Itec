"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import type { Profile } from "@/types/database";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bot,
  Code2,
  FolderOpen,
  Info,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  Terminal,
  Tv,
} from "lucide-react";

const topNavItems = [
  { label: "FILES", href: "/dashboard" },
  { label: "EDIT", href: "#" },
  { label: "SELECTION", href: "#" },
  { label: "VIEW", href: "#" },
];

type NavIcon = {
  icon: LucideIcon;
  href: string;
  label: string;
};

const sideNavIcons: NavIcon[] = [
  { icon: LayoutGrid, href: "/dashboard", label: "Dashboard" },
  { icon: Code2, href: "/workspace", label: "Workspace" },
  { icon: Terminal, href: "#", label: "Terminal" },
  { icon: FolderOpen, href: "#", label: "Files" },
  { icon: Settings, href: "#", label: "Settings" },
];

const bottomNavIcons: NavIcon[] = [
  { icon: Tv, href: "#", label: "Preview" },
  { icon: Info, href: "#", label: "Info" },
  { icon: Bot, href: "#", label: "AI" },
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

  function handleNavClick(href: string) {
    if (href === "#") return;
    router.push(href);
  }

  const avatarInitial = (profile?.username ?? user?.email ?? "?")[0]?.toUpperCase();

  return (
    <div className="aether-theme bg-[#050d1a] text-on-surface min-h-screen">
      {/* ═══ TOP NAV BAR ═══ */}
      <nav className="bg-[#080f1e]/90 backdrop-blur-xl text-slate-200 font-manrope tracking-tight text-xs w-full top-0 z-50 flex justify-between items-center px-4 py-2.5 fixed border-b border-white/5">
        <div className="flex items-center gap-6">
          {/* Brand */}
          <span className="text-sm font-black text-cyan-400 tracking-[0.15em] uppercase">
            Architect_IDE
          </span>
          {/* Menu Items */}
          <div className="hidden md:flex gap-1">
            {topNavItems.map((item) => {
              const isActive = item.href !== "#" && pathname === item.href;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  className={
                    isActive
                      ? "text-cyan-400 font-bold px-3 py-1.5 rounded-md transition-colors duration-200 uppercase tracking-wider text-[10px]"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5 px-3 py-1.5 rounded-md transition-colors duration-200 uppercase tracking-wider text-[10px]"
                  }
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden lg:flex items-center bg-white/5 rounded-lg px-3 py-1.5 border border-white/5 w-64">
          <Search className="h-4 w-4 text-slate-500 mr-2" />
          <span className="text-[10px] text-slate-500">Search commands...</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button className="text-slate-500 hover:text-white transition-colors" type="button">
            <Settings className="h-5 w-5" />
          </button>
          <button className="text-slate-500 hover:text-white transition-colors relative" type="button">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full" />
          </button>
          <button
            className="bg-cyan-400 hover:bg-cyan-300 text-[#050d1a] px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-[0.15em] transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            type="button"
          >
            Deploy
          </button>
          <div
            className="w-7 h-7 rounded-full border border-cyan-500/30 flex items-center justify-center text-[9px] font-bold text-cyan-400 cursor-pointer"
            style={{ backgroundColor: profile?.avatar_color_hex ?? "#0a1628" }}
            aria-label="User profile"
          >
            {avatarInitial}
          </div>
        </div>
      </nav>

      {/* ═══ SLIM ICON SIDEBAR ═══ */}
      <aside className="bg-[#080f1e]/90 backdrop-blur-2xl w-14 left-0 top-0 fixed hidden lg:flex flex-col items-center py-14 border-r border-white/5 z-40 h-screen">
        {/* Brand Icon */}
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-8">
          <span className="text-cyan-400 font-black text-sm">A</span>
        </div>

        {/* Main Nav Icons */}
        <nav className="flex-1 flex flex-col items-center gap-1">
          {sideNavIcons.map((item) => {
            const isActive = item.href !== "#" && pathname === item.href;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item.href)}
                title={item.label}
                className={
                  isActive
                    ? "w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 transition-all duration-200"
                    : "w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all duration-200"
                }
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </nav>

        {/* Bottom Icons */}
        <div className="flex flex-col items-center gap-1 mt-auto">
          {bottomNavIcons.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item.href)}
                title={item.label}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all duration-200"
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            title={isLoggingOut ? "Logging out..." : "Log Out"}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 disabled:opacity-50"
            type="button"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT CANVAS ═══ */}
      <main className="lg:ml-14 pt-12 pb-12 px-5 lg:px-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
