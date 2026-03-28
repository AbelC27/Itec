import { Bot, MessageSquare, Sparkles } from "lucide-react";

type Suggestion = {
    id: string;
    title: string;
    description: string;
};

const suggestions: Suggestion[] = [
    {
        id: "s-1",
        title: "Summarize the latest commits",
        description: "Generate a changelog for the last 24 hours.",
    },
    {
        id: "s-2",
        title: "Review the checksum fix",
        description: "Analyze T-14 changes for regressions.",
    },
    {
        id: "s-3",
        title: "Create a pairing brief",
        description: "Outline what peers should know before joining.",
    },
];

export default function AssistantPage() {
    return (
        <section className="space-y-6">
            <header className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                    AI Assistant
                </p>
                <h1 className="mt-3 text-2xl font-semibold text-slate-100">
                    Assistant Workspace
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                    Curate prompts, capture insights, and launch guided reviews for your team.
                </p>
            </header>

            <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    <Sparkles className="h-4 w-4 text-blue-300" />
                    Suggested Prompts
                </div>
                <div className="mt-4 space-y-3">
                    {suggestions.map((item) => (
                        <div
                            key={item.id}
                            className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
                        >
                            <p className="text-sm font-semibold text-slate-100">
                                {item.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    <Bot className="h-4 w-4 text-blue-300" />
                    Start a Session
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs text-slate-400">
                    <MessageSquare className="h-4 w-4" />
                    Ask the assistant to prepare a review brief...
                </div>
            </section>
        </section>
    );
}
