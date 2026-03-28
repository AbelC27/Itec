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
      <section className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold font-manrope text-on-surface tracking-tighter leading-none">
          Welcome to iTECify
        </h1>
        <p className="text-on-surface-variant max-w-lg text-lg font-body leading-relaxed">
          Your profile is being set up. Please refresh the page in a moment.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ HERO PROFILE CARD ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1628] to-[#0d1f3c] border border-cyan-500/10 p-6 md:p-8">
        {/* Decorative background glow */}
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute right-0 bottom-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar + Info */}
          <div className="flex items-center gap-5 flex-1">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#0c2a3e] to-[#0a1e30] border border-cyan-500/20 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.08)]">
              <span className="material-symbols-outlined text-4xl text-cyan-400" style={{ fontVariationSettings: '"FILL" 1' }}>
                terminal
              </span>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-black font-manrope text-white tracking-tight uppercase">
                NEON_ARCHITECT_01
              </h1>
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-[0.25em] mt-1">
                Senior Systems Optimizer
              </p>

              {/* Progress bar */}
              <div className="mt-4 max-w-md">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                    Progress to Level 43
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">85%</span>
                </div>
                <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-purple-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]" />
                </div>
              </div>

              {/* Tags row */}
              <div className="flex items-center gap-3 mt-4">
                <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  LV.42
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  12 Day Streak
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="material-symbols-outlined text-xs text-amber-400">emoji_events</span>
                  Rank #4 Global
                </span>
              </div>
            </div>
          </div>

          {/* XP Counter */}
          <div className="text-right shrink-0">
            <span className="text-4xl md:text-5xl font-black font-manrope text-cyan-400">12,450</span>
            <span className="text-sm font-bold text-cyan-400/60 ml-1 uppercase">XP</span>
          </div>
        </div>
      </div>

      {/* ═══ MAIN GRID: Achievements + Right Panel ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT: Achievements ── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black font-manrope text-white uppercase tracking-[0.2em]">
              Achievements_Unlocked
            </h2>
            <button className="text-xs font-bold text-cyan-400 uppercase tracking-wider hover:text-white transition-colors" type="button">
              View All
            </button>
          </div>

          {/* Achievement Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Bug Hunter */}
            <div className="group relative rounded-xl bg-[#0a1628]/80 border border-cyan-500/10 p-5 flex flex-col items-center text-center hover:border-cyan-500/30 hover:bg-[#0d1f3c] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all">
                <span className="material-symbols-outlined text-3xl text-cyan-400" style={{ fontVariationSettings: '"FILL" 1' }}>
                  pest_control
                </span>
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">Bug Hunter</h4>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">100 Issues Resolved</p>
            </div>

            {/* Refactor Master */}
            <div className="group relative rounded-xl bg-[#0a1628]/80 border border-purple-500/10 p-5 flex flex-col items-center text-center hover:border-purple-500/30 hover:bg-[#1a0d2e] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all">
                <span className="material-symbols-outlined text-3xl text-purple-400" style={{ fontVariationSettings: '"FILL" 1' }}>
                  auto_fix_high
                </span>
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">Refactor Master</h4>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Cleaner Architecture</p>
            </div>

            {/* Fast Deployer */}
            <div className="group relative rounded-xl bg-[#0a1628]/80 border border-emerald-500/10 p-5 flex flex-col items-center text-center hover:border-emerald-500/30 hover:bg-[#0a2818] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all">
                <span className="material-symbols-outlined text-3xl text-emerald-400" style={{ fontVariationSettings: '"FILL" 1' }}>
                  rocket_launch
                </span>
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">Fast Deployer</h4>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Sub-10s Build Time</p>
            </div>

            {/* Security Sage (Locked) */}
            <div className="group relative rounded-xl bg-[#0a1628]/40 border border-white/5 p-5 flex flex-col items-center text-center opacity-50 cursor-not-allowed">
              <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-slate-600">lock</span>
              </div>
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Security Sage</h4>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">Locked</p>
            </div>
          </div>
        </section>

        {/* ── RIGHT PANEL ── */}
        <aside className="lg:col-span-4 space-y-6">
          {/* System Status */}
          <div className="rounded-xl bg-[#0a1628]/80 border border-white/5 p-5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-cyan-400">settings_input_antenna</span>
              System Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                  <span className="text-xs font-medium text-white">Core Compiler</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Optimized</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                  <span className="text-xs font-medium text-white">Neural Bridge</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                  <span className="text-xs font-medium text-slate-400">Remote Sync</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Standby</span>
              </div>
            </div>
            <button
              className="w-full mt-5 py-2.5 rounded-lg border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-[0.15em] hover:bg-cyan-500/10 transition-all"
              type="button"
            >
              Run Diagnostics
            </button>
          </div>

          {/* Recent Sessions */}
          <div className="rounded-xl bg-[#0a1628]/80 border border-white/5 p-5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">
              Recent Sessions
            </h3>
            <div className="space-y-4">
              {/* Alex_Dev */}
              <div className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-base text-cyan-400">person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">Alex_Dev</p>
                  <p className="text-[10px] text-cyan-500/60 uppercase tracking-wider">Editing: Index.ts</p>
                </div>
                <span className="material-symbols-outlined text-slate-600 text-base hover:text-white transition-colors cursor-pointer">open_in_new</span>
              </div>
              {/* Sarah_Code */}
              <div className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-base text-cyan-400">person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">Sarah_Code</p>
                  <p className="text-[10px] text-cyan-500/60 uppercase tracking-wider">Reviewing: PR #421</p>
                </div>
                <span className="material-symbols-outlined text-slate-600 text-base hover:text-white transition-colors cursor-pointer">open_in_new</span>
              </div>
              {/* Marcus_Logic */}
              <div className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-base text-cyan-400">person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">Marcus_Logic</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Last seen 4h ago</p>
                </div>
                <span className="material-symbols-outlined text-slate-600 text-base hover:text-white transition-colors cursor-pointer">schedule</span>
              </div>
            </div>
            <button
              className="w-full mt-5 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400/70 hover:text-cyan-400 transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-sm">group_add</span>
              Invite to Workspace
            </button>
          </div>
        </aside>
      </div>

      {/* ═══ SYSTEM PERFORMANCE BAR ═══ */}
      <div className="rounded-xl bg-[#0a1628]/80 border border-white/5 px-6 py-4 flex items-center gap-6">
        <span className="material-symbols-outlined text-xl text-cyan-400/40">monitoring</span>
        <div className="flex-1 flex items-center justify-around">
          <div className="text-center">
            <span className="text-xl font-black font-manrope text-white">2.4k</span>
            <p className="text-[8px] text-slate-500 uppercase tracking-[0.2em] mt-0.5">Lines/Day</p>
          </div>
          <div className="w-px h-8 bg-white/5" />
          <div className="text-center">
            <span className="text-xl font-black font-manrope text-white">98.2%</span>
            <p className="text-[8px] text-slate-500 uppercase tracking-[0.2em] mt-0.5">Sync Rate</p>
          </div>
          <div className="w-px h-8 bg-white/5" />
          <div className="text-center">
            <span className="text-xl font-black font-manrope text-white">12ms</span>
            <p className="text-[8px] text-slate-500 uppercase tracking-[0.2em] mt-0.5">Latency</p>
          </div>
        </div>
      </div>
    </div>
  );
}
