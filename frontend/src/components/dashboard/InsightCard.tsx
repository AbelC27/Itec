import { Sparkles } from "lucide-react";

export default function InsightCard() {
    return (
        <section className="rounded-2xl border border-blue-900/60 bg-gradient-to-br from-blue-950/80 via-slate-950/80 to-slate-950/90 p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">
                <Sparkles className="h-4 w-4" />
                AI Insight
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-blue-200/80">
                No insights yet.
            </p>
        </section>
    );
}
