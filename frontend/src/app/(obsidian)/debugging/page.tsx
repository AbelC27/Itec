import {
    Bot,
    CircleDot,
    FileCode2,
    Pause,
    Play,
    SkipBack,
    SkipForward,
} from "lucide-react";

export default function DebuggingPage() {
    return (
        <section className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                    <section className="relative rounded-2xl border border-slate-900 bg-slate-950/80">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                    No open files
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <FileCode2 className="h-4 w-4" />
                                analyzer.ts
                            </div>
                        </div>
                        <div className="relative grid gap-1.5 px-4 py-4 font-mono text-[13px] text-slate-200">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                No code loaded yet.
                            </p>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                                <CircleDot className="h-4 w-4 text-blue-300" />
                                Timeline History
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                                <button className="rounded-full border border-slate-800 p-2 hover:text-slate-200" type="button">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button className="rounded-full border border-slate-800 p-2 hover:text-slate-200" type="button">
                                    <Play className="h-4 w-4" />
                                </button>
                                <button className="rounded-full border border-slate-800 p-2 hover:text-slate-200" type="button">
                                    <Pause className="h-4 w-4" />
                                </button>
                                <button className="rounded-full border border-slate-800 p-2 hover:text-slate-200" type="button">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                No timeline data yet.
                            </p>
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-5">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                            <Bot className="h-4 w-4 text-blue-300" />
                            Insight Engine
                        </div>
                        <div className="mt-4 space-y-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                No insight data yet.
                            </p>
                        </div>
                    </section>
                </aside>
            </div>
        </section>
    );
}
