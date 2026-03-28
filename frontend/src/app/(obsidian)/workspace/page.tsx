"use client";

import type { ComponentProps, ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
    ArrowRight,
    Bot,
    Check,
    ChevronRight,
    CircleDot,
    FileCode2,
    Flame,
    Pause,
    Play,
    SkipBack,
    SkipForward,
    Terminal,
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
    { name: "main.ts", isActive: true },
    { name: "styles.css" },
    { name: "workspace.ts" },
];

const codeLines: CodeLine[] = [
    {
        line: 1,
        content: (
            <>
                <span className="text-slate-400">import</span>
                <span className="text-slate-200"> {"{"} ObsidianEngine {"}"}</span>
                <span className="text-slate-400"> from </span>
                <span className="text-blue-200">"@core/engine"</span>
            </>
        ),
    },
    {
        line: 2,
        content: (
            <>
                <span className="text-slate-400">import</span>
                <span className="text-slate-200"> {"{"} Workspace {"}"}</span>
                <span className="text-slate-400"> from </span>
                <span className="text-blue-200">"./models"</span>
            </>
        ),
    },
    { line: 3, content: "" },
    {
        line: 4,
        content: "// initialize the collaboration stage and environment",
        tone: "comment",
    },
    {
        line: 5,
        content: (
            <>
                <span className="text-slate-400">async</span>
                <span className="text-slate-200"> function initWorkspace(</span>
                <span className="text-blue-200">id</span>
                <span className="text-slate-200">: string) {"{"}</span>
            </>
        ),
        highlight: true,
    },
    {
        line: 6,
        content: (
            <>
                <span className="text-slate-400">  const</span>
                <span className="text-slate-200"> engine = new ObsidianEngine({"{"}</span>
                <span className="text-blue-200"> projectId</span>
                <span className="text-slate-200">: </span>
                <span className="text-blue-200">id</span>
                <span className="text-slate-200">, mode: </span>
                <span className="text-blue-200">"COLLABORATIVE"</span>
                <span className="text-slate-200"> {"}"});</span>
            </>
        ),
    },
    {
        line: 7,
        content: (
            <>
                <span className="text-slate-400">  await</span>
                <span className="text-slate-200"> engine.mount();</span>
                <span className="ml-3 rounded-full bg-blue-900/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-blue-200">
                    AI
                </span>
            </>
        ),
    },
    {
        line: 8,
        content: (
            <>
                <span className="text-slate-400">  await</span>
                <span className="text-slate-200"> engine.preloadPeers({"{"}</span>
                <span className="text-blue-200"> strategy</span>
                <span className="text-slate-200">: </span>
                <span className="text-blue-200">"aggressive"</span>
                <span className="text-slate-200"> {"}"});</span>
            </>
        ),
        tone: "warning",
    },
    {
        line: 9,
        content: "}",
    },
    { line: 10, content: "" },
    {
        line: 11,
        content: (
            <>
                <span className="text-slate-400">return</span>
                <span className="text-slate-200"> engine.start();</span>
            </>
        ),
    },
];

const logicFlow = [
    "Header validation",
    "Checksum guard",
    "Payload extraction",
    "State commit",
];

const variables = [
    { label: "checksum", value: "0xB27A" },
    { label: "status", value: "VALID" },
    { label: "payload", value: "16kb" },
];

type PanelGroupProps = ComponentProps<typeof Group> & {
    direction?: "horizontal" | "vertical";
};

function PanelGroup({ direction = "horizontal", ...props }: PanelGroupProps) {
    return <Group orientation={direction} {...props} />;
}

type PanelResizeHandleProps = ComponentProps<typeof Separator>;

function PanelResizeHandle(props: PanelResizeHandleProps) {
    return <Separator {...props} />;
}

export default function ObsidianWorkspacePage() {
    return (
        <section className="space-y-6">
            <PanelGroup direction="horizontal" className="h-[calc(100vh-9.5rem)]">
                <Panel defaultSize={72} minSize={45} className="pr-4">
                    <PanelGroup direction="vertical" className="h-full">
                        <Panel defaultSize={72} minSize={40} className="pb-4">
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
                                            main.ts
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
                                        <div className="absolute right-6 top-36 w-56 rounded-xl border border-slate-800 bg-slate-950/90 p-3 shadow-lg">
                                            <p className="text-[10px] uppercase tracking-[0.3em] text-blue-200">
                                                AI Suggestion
                                            </p>
                                            <p className="mt-2 text-xs text-slate-300">
                                                Optimize peer preload by batching initialization to reduce
                                                sync spikes.
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

                                <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                                    <div className="space-y-4">
                                        <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-4">
                                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                                                <Flame className="h-4 w-4 text-amber-300" />
                                                System Stress: High
                                            </div>
                                            <p className="mt-3 text-xs text-slate-400">
                                                The Docker container is nearing RAM limits. I am feeling a
                                                bit... overwhelmed.
                                            </p>
                                        </section>
                                        <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-4 text-xs text-slate-500">
                                            Drag logs or files here to analyze.
                                        </section>
                                    </div>
                                </div>
                            </div>
                        </Panel>
                        <PanelResizeHandle className="h-px bg-slate-900 hover:bg-blue-400/60 data-[resize-handle-state=drag]:bg-blue-400/80" />
                        <Panel defaultSize={28} minSize={20} className="pt-4">
                            <section className="h-full rounded-2xl border border-slate-900 bg-slate-950/80 p-4">
                                <div className="flex items-center justify-between border-b border-slate-900 pb-3 text-xs uppercase tracking-[0.3em] text-slate-500">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-200">Terminal</span>
                                        <span>Live Output</span>
                                        <span>Debug Console</span>
                                    </div>
                                    <span className="text-slate-400">T-14</span>
                                </div>
                                <div className="mt-3 space-y-2 font-mono text-[12px] text-slate-400">
                                    <p>[info] Container "obsidian-runner-alpha" started successfully.</p>
                                    <p>[info] Listening on port 3000...</p>
                                    <p className="text-amber-300">[warn] Memory limit exceeded on line 42: Heap allocation failed.</p>
                                    <p>[info] Scanning for leaked handles...</p>
                                    <p className="text-blue-200">AI Suggestion: Increase Docker memory limit or refactor preloadPeers().</p>
                                </div>
                            </section>
                        </Panel>
                    </PanelGroup>
                </Panel>
                <PanelResizeHandle className="w-px bg-slate-900 hover:bg-blue-400/60 data-[resize-handle-state=drag]:bg-blue-400/80" />
                <Panel defaultSize={28} minSize={22} className="pl-4">
                    <aside className="space-y-6">
                        <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-5">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                                <Bot className="h-4 w-4 text-blue-300" />
                                AI Assistant
                            </div>
                            <div className="mt-4 space-y-4">
                                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                        Performance Note
                                    </p>
                                    <p className="mt-2 text-sm text-slate-200">
                                        I detected a performance bottleneck in your initialization
                                        sequence. Would you like me to generate a worker-based
                                        loading strategy?
                                    </p>
                                </div>
                                <div className="rounded-xl border border-blue-900/60 bg-blue-950/60 p-3">
                                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-blue-200">
                                        Recommended Mutate
                                        <span className="rounded-full border border-blue-900/80 bg-blue-950 px-2 py-0.5 text-[10px] text-blue-100">
                                            1 issue
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-200">
                                        preloadPeers()
                                    </p>
                                    <button
                                        type="button"
                                        className="mt-3 w-full rounded-full border border-blue-900/70 bg-blue-950/80 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-blue-100 transition hover:bg-blue-900/60"
                                    >
                                        Apply Mutation
                                    </button>
                                </div>
                                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-500">
                                    Drag & Drop for AI Analysis
                                    <p className="mt-2 text-[11px] text-slate-500">
                                        Accepts .js, .py, and .dockerfile
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-5">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Ask a Question
                            </p>
                            <div className="mt-3 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
                                <Terminal className="h-4 w-4" />
                                Ask about this state...
                                <span className="ml-auto rounded-full border border-blue-900/70 bg-blue-950/80 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-blue-100">
                                    Enter
                                </span>
                            </div>
                        </section>
                    </aside>
                </Panel>
            </PanelGroup>
        </section>
    );
}
