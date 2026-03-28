import { Activity, FolderOpen, Users } from "lucide-react";

type OverviewCard = {
    title: string;
    value: string;
    description: string;
    icon: typeof Activity;
};

const overviewCards: OverviewCard[] = [
    {
        title: "Active Sessions",
        value: "3",
        description: "Collaborative rooms live now",
        icon: Activity,
    },
    {
        title: "Open Workspaces",
        value: "12",
        description: "Files in progress today",
        icon: FolderOpen,
    },
    {
        title: "Peers Online",
        value: "9",
        description: "Available for review",
        icon: Users,
    },
];

export default function ObsidianHomePage() {
    return (
        <section className="space-y-6">
            <header className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                    Home
                </p>
                <h1 className="mt-3 text-2xl font-semibold text-slate-100">
                    Workspace Overview
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    Track active collaboration, recent edits, and peer availability in
                    your Obsidian IDE workspace.
                </p>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
                {overviewCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.title}
                            className="rounded-2xl border border-slate-900 bg-slate-950/80 p-5"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                    {card.title}
                                </p>
                                <Icon className="h-4 w-4 text-blue-300" />
                            </div>
                            <p className="mt-3 text-2xl font-semibold text-slate-100">
                                {card.value}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                                {card.description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
