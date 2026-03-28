import { Plus, PlugZap } from "lucide-react";

type DashboardHeaderProps = {
    userName?: string;
    extensionConnected: boolean;
};

export default function DashboardHeader({
    userName,
    extensionConnected,
}: DashboardHeaderProps) {
    const displayName = userName ?? "there";
    const statusLabel = extensionConnected ? "Connected" : "Offline";
    const statusDotClass = extensionConnected
        ? "bg-emerald-400"
        : "bg-slate-500";

    return (
        <header className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                        Dashboard
                    </p>
                    <h1 className="text-3xl font-semibold text-slate-100 md:text-4xl">
                        Workspace Overview
                    </h1>
                    <p className="max-w-2xl text-sm text-slate-400">
                        Welcome back, {displayName}.
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                        <PlugZap className="h-4 w-4 text-blue-300" />
                        <span>VS Code Extension</span>
                        <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
                        <span className="text-slate-100">{statusLabel}</span>
                    </div>
                </div>
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-blue-800/70 bg-blue-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-700/80 hover:bg-blue-900/60"
                >
                    <Plus className="h-4 w-4" />
                    New Session
                </button>
            </div>
        </header>
    );
}
