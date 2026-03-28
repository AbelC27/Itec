import { ShieldCheck } from "lucide-react";

export default function ConnectedEnvironments() {
    return (
        <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Connected Environments
                </h2>
                <ShieldCheck className="h-4 w-4 text-blue-300" />
            </div>
            <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    No environments connected.
                </p>
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
