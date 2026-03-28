"use client";

import type { ComponentProps } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
    Bot,
    FileCode2,
    Flame,
    Terminal,
} from "lucide-react";

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
                                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                                No open files
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <FileCode2 className="h-4 w-4" />
                                            main.ts
                                        </div>
                                    </div>
                                    <div className="relative grid gap-1.5 px-4 py-4 font-mono text-[13px] text-slate-200">
                                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                            No code loaded yet.
                                        </p>
                                    </div>
                                </section>

                                <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                                    <div className="space-y-4">
                                        <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-4">
                                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                                                <Flame className="h-4 w-4 text-amber-300" />
                                                System Stress
                                            </div>
                                            <p className="mt-3 text-xs text-slate-400">
                                                No system metrics yet.
                                            </p>
                                        </section>
                                        <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-4 text-xs text-slate-500">
                                            No analysis data yet.
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
                                    <p>No terminal output yet.</p>
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
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                    No assistant insights yet.
                                </p>
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
