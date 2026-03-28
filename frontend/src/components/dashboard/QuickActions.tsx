import { ArrowUpRight, LogIn, Plus } from "lucide-react";

type QuickAction = {
    id: string;
    label: string;
    description: string;
    icon: typeof Plus;
    tone: "primary" | "secondary";
};

const actions: QuickAction[] = [
    {
        id: "create",
        label: "Create New Session",
        description: "Start a fresh collaborative workspace.",
        icon: Plus,
        tone: "primary",
    },
    {
        id: "join",
        label: "Join Session",
        description: "Connect to an existing shared room.",
        icon: LogIn,
        tone: "secondary",
    },
];

export default function QuickActions() {
    return (
        <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Quick Actions
                </h2>
                <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-4 space-y-3">
                {actions.map((action) => {
                    const Icon = action.icon;
                    const toneClasses =
                        action.tone === "primary"
                            ? "border-blue-800/70 bg-blue-950/80 hover:bg-blue-900/60"
                            : "border-slate-800 bg-slate-950/80 hover:bg-slate-900/60";

                    return (
                        <button
                            key={action.id}
                            type="button"
                            className={`group flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${toneClasses}`}
                        >
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-100">
                                    {action.label}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {action.description}
                                </p>
                            </div>
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-blue-200 transition group-hover:border-blue-700/70">
                                <Icon className="h-4 w-4" />
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
