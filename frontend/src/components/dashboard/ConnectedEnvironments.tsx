import { Cloud, HardDrive, ShieldCheck } from "lucide-react";

type Environment = {
    id: string;
    name: string;
    detail: string;
    status: string;
    icon: typeof Cloud;
    statusTone: "online" | "standby";
};

const environments: Environment[] = [
    {
        id: "env-aws",
        name: "AWS Dev Instance-01",
        detail: "Realtime metrics connected",
        status: "Online",
        icon: Cloud,
        statusTone: "online",
    },
    {
        id: "env-local",
        name: "Local Workstation",
        detail: "Macbook Pro - Connected",
        status: "Standby",
        icon: HardDrive,
        statusTone: "standby",
    },
];

export default function ConnectedEnvironments() {
    return (
        <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Connected Environments
                </h2>
                <ShieldCheck className="h-4 w-4 text-blue-300" />
            </div>
            <div className="mt-4 space-y-3">
                {environments.map((environment) => {
                    const Icon = environment.icon;
                    const statusClass =
                        environment.statusTone === "online"
                            ? "bg-emerald-400"
                            : "bg-slate-500";

                    return (
                        <div
                            key={environment.id}
                            className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-blue-200">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-100">
                                        {environment.name}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {environment.detail}
                                    </p>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                                <span className={`h-2 w-2 rounded-full ${statusClass}`} />
                                {environment.status}
                            </span>
                        </div>
                    );
                })}
            </div>
            <button
                type="button"
                className="mt-4 w-full rounded-full border border-slate-800 bg-slate-950 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:border-blue-800/70 hover:text-blue-100"
            >
                Manage Environments
            </button>
        </section>
    );
}
