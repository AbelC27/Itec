import { Plus, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <header className="rounded-2xl border border-white/10 bg-background p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                        Dashboard
                    </p>
                    <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
                        Workspace Overview
                    </h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Welcome back, {displayName}.
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-secondary px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        <PlugZap className="h-4 w-4 text-muted-foreground" />
                        <span>VS Code Extension</span>
                        <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
                        <span className="text-foreground">{statusLabel}</span>
                    </div>
                </div>
                <Button variant="outline" className="inline-flex items-center gap-2 rounded-full">
                    <Plus className="h-4 w-4" />
                    New Session
                </Button>
            </div>
        </header>
    );
}
