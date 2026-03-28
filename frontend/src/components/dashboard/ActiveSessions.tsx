import { ArrowUpRight, Code2, Radio, Users } from "lucide-react";

type Peer = {
    name: string;
    initials: string;
};

type Session = {
    id: string;
    name: string;
    description: string;
    stack: string;
    status: string;
    membersActive: number;
    openFiles: number;
    participants: Peer[];
};

const sessions: Session[] = [
    {
        id: "session-neo",
        name: "Neural Engine Optimization",
        description: "Refining inference logic for the core ML model.",
        stack: "Next.js, Supabase, Edge",
        status: "Live now",
        membersActive: 12,
        openFiles: 8,
        participants: [
            { name: "Avery Rhodes", initials: "AR" },
            { name: "Mina Park", initials: "MP" },
            { name: "Luis Cortez", initials: "LC" },
            { name: "Jae Kim", initials: "JK" },
        ],
    },
    {
        id: "session-obsidian",
        name: "Cloud Infrastructure Audit",
        description: "Reviewing Terraform scripts for the cluster migration.",
        stack: "Yjs, WebRTC, Postgres",
        status: "Review in progress",
        membersActive: 6,
        openFiles: 3,
        participants: [
            { name: "Priya Shah", initials: "PS" },
            { name: "Dylan Fox", initials: "DF" },
            { name: "Hana Mori", initials: "HM" },
        ],
    },
    {
        id: "session-analyze",
        name: "Realtime Sync Tuning",
        description: "Balancing Yjs providers for low-latency edits.",
        stack: "Python, FastAPI, Redis",
        status: "Live now",
        membersActive: 9,
        openFiles: 5,
        participants: [
            { name: "Noah Briggs", initials: "NB" },
            { name: "Zara Lee", initials: "ZL" },
            { name: "Kai Zheng", initials: "KZ" },
            { name: "Sofia Patel", initials: "SP" },
            { name: "Eli Winters", initials: "EW" },
        ],
    },
    {
        id: "session-release",
        name: "Release Control",
        description: "Coordinating the next production push.",
        stack: "Rust, WASM, GraphQL",
        status: "Standby",
        membersActive: 2,
        openFiles: 1,
        participants: [
            { name: "Marta Voss", initials: "MV" },
            { name: "Ira Stone", initials: "IS" },
        ],
    },
];

export default function ActiveSessions() {
    return (
        <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-300" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Active Collaborative Sessions
                    </h2>
                </div>
                <button
                    type="button"
                    className="text-xs uppercase tracking-[0.2em] text-blue-200 transition hover:text-blue-100"
                >
                    View All
                </button>
            </div>
            <div className="mt-5 space-y-4">
                {sessions.map((session) => {
                    const visiblePeers = session.participants.slice(0, 4);
                    const extraPeers = session.participants.length - visiblePeers.length;
                    const isLive = session.status.toLowerCase().includes("live");

                    return (
                        <div
                            key={session.id}
                            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-blue-200">
                                        <Code2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-100">
                                            {session.name}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {session.description}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5" />
                                                {session.membersActive} members active
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Code2 className="h-3.5 w-3.5" />
                                                {session.openFiles} files open
                                            </span>
                                            <span className="text-slate-400">{session.stack}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-slate-400 transition hover:text-slate-200"
                                >
                                    <ArrowUpRight className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {visiblePeers.map((peer) => (
                                        <div
                                            key={peer.name}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-[10px] font-semibold text-slate-200"
                                            title={peer.name}
                                        >
                                            {peer.initials}
                                        </div>
                                    ))}
                                    {extraPeers > 0 ? (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-[10px] font-semibold text-slate-400">
                                            +{extraPeers}
                                        </div>
                                    ) : null}
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                                    <Radio className={`h-3 w-3 ${isLive ? "text-emerald-400" : "text-slate-500"}`} />
                                    {session.status}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
