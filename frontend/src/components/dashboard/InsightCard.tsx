import { Sparkles } from "lucide-react";

export default function InsightCard() {
    return (
        <section className="rounded-2xl border border-blue-900/60 bg-gradient-to-br from-blue-950/80 via-slate-950/80 to-slate-950/90 p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">
                <Sparkles className="h-4 w-4" />
                AI Insight
            </div>
            <p className="mt-4 text-sm text-slate-200">
                Your team edits 15% faster when review sessions start within 10 minutes
                of a commit. Schedule a focused review block?
            </p>
            <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-800/70 bg-blue-950/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-100 transition hover:bg-blue-900/60"
            >
                Create Review Session
            </button>
        </section>
    );
}
