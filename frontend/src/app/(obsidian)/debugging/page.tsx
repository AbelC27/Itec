import type { ReactNode } from "react";
import {
    Bot,
    Check,
    ChevronRight,
    CircleDot,
    FileCode2,
    Pause,
    Play,
    SkipBack,
    SkipForward,
} from "lucide-react";

type CodeLine = {
    line: number;
    content: ReactNode;
    tone?: "default" | "comment" | "accent" | "warning";
    highlight?: boolean;
};

type FileTab = {
    name: string;
    isActive?: boolean;
};

const fileTabs: FileTab[] = [
    { name: "analyzer.ts", isActive: true },
    { name: "utils.ts" },
    { name: "packets.ts" },
];

const codeLines: CodeLine[] = [
    {
        line: 1,
        content: (
            <>
                <span className="text-slate-400">async</span>
                <span className="text-slate-200"> function analyzePacket(</span>
                <span className="text-blue-200">data</span>
                <span className="text-slate-200">: Buffer) {"{"}</span>
            </>
        ),
        highlight: true,
    },
    {
        line: 2,
        content: (
            <>
                <span className="text-slate-400">  const</span>
                <span className="text-slate-200"> header = data.slice(0, 16);</span>
            </>
        ),
    },
    {
        line: 3,
        content: (
            <>
                <span className="text-slate-400">  const</span>
                <span className="text-slate-200"> checksum = calculateCRC32(header);</span>
            </>
        ),
    },
    {
        line: 4,
        content: "  // Check for parity mismatches from state T-14",
        tone: "comment",
    },
    {
        line: 5,
        content: (
            <>
                <span className="text-slate-400">  if</span>
                <span className="text-slate-200"> (checksum !== header.readUInt32BE(12)) {"{"}</span>
            </>
        ),
        tone: "warning",
    },
    {
        line: 6,
        content: (
            <>
                <span className="text-slate-400">    throw</span>
                <span className="text-slate-200"> new Error(</span>
                <span className="text-amber-300">"Invalid packet header"</span>
                <span className="text-slate-200">);</span>
            </>
        ),
    },
    { line: 7, content: "  }" },
    { line: 8, content: "" },
    {
        line: 9,
        content: (
            <>
                <span className="text-slate-400">  return</span>
                <span className="text-slate-200"> await processPayload(data.slice(16));</span>
            </>
        ),
    },
    { line: 10, content: "}" },
];

const logicFlow = [
    "Header validation",
    "Checksum guard",
    "Payload extraction",
];

const variables = [
    { label: "checksum", value: "0xB27A" },
    { label: "status", value: "VALID" },
];

export default function DebuggingPage() {
    return (
        <section className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                    <section className="relative rounded-2xl border border-slate-900 bg-slate-950/80">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 px-4 py-3">
                            <div className="flex items-center gap-2">
                                {fileTabs.map((tab) => (
                                    <button
                                        key={tab.name}
                                        type="button"
                                        className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] transition ${tab.isActive
                                            ? "bg-blue-950/80 text-blue-100"
                                            : "text-slate-500 hover:text-slate-200"
                                            }`}
                                    >
                                        {tab.name}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <FileCode2 className="h-4 w-4" />
                                analyzer.ts
                            </div>
                        </div>
                        <div className="relative grid gap-1.5 px-4 py-4 font-mono text-[13px] text-slate-200">
                            {codeLines.map((line) => {
                                const toneClass =
                                    line.tone === "comment"
                                        ? "text-slate-500"
                                        : line.tone === "warning"
                                            ? "text-amber-300"
                                            : "text-slate-200";

                                return (
                                    <div
                                        key={line.line}
                                        className={`grid grid-cols-[auto_1fr] gap-4 rounded-lg px-2 py-1 ${line.highlight
                                            ? "bg-blue-900/20"
                                            : "hover:bg-slate-900/40"
                                            }`}
                                    >
                                        <span className="w-8 text-right text-slate-600">
                                            {line.line.toString().padStart(2, "0")}
                                        </span>
                                        <span className={toneClass}>{line.content}</span>
                                    </div>
                                );
                            })}
                            <div className="absolute right-6 top-32 w-56 rounded-xl border border-slate-800 bg-slate-950/90 p-3 shadow-lg">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-blue-200">
                                    AI Suggestion
                                </p>
                                <p className="mt-2 text-xs text-slate-300">
                                    Disable peer preload until checksum validation passes.
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="flex items-center gap-1 rounded-full border border-blue-900/70 bg-blue-950/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-blue-100"
                                    >
                                        <Check className="h-3 w-3" />
                                        Accept
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-full border border-slate-800 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
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
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>State: T-14 (Checksum Calculation)</span>
                                <span>0:32 elapsed</span>
                            </div>
                            <div className="mt-3 h-1.5 rounded-full bg-slate-900">
                                <div className="h-full w-[62%] rounded-full bg-blue-600" />
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-600">
                                <span>Start</span>
                                <ChevronRight className="h-3 w-3" />
                                <span>Error Detected</span>
                                <ChevronRight className="h-3 w-3" />
                                <span>Patch Applied</span>
                                <ChevronRight className="h-3 w-3" />
                                <span>Current State</span>
                            </div>
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
                            <div className="rounded-xl border border-blue-900/60 bg-blue-950/60 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                    Logic Step
                                </p>
                                <p className="mt-2 text-sm text-slate-200">
                                    At T-14, the analyzer is verifying the integrity of the
                                    16-byte header. If the checksum fails, the process halts to
                                    prevent payload corruption.
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                    Logic Flow
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {logicFlow.map((item) => (
                                        <span
                                            key={item}
                                            className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                    Variables at T-14
                                </p>
                                <div className="mt-3 space-y-2">
                                    {variables.map((item) => (
                                        <div
                                            key={item.label}
                                            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs"
                                        >
                                            <span className="text-slate-400">
                                                {item.label}
                                            </span>
                                            <span className="text-slate-200">
                                                {item.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
        </section>
    );
}
