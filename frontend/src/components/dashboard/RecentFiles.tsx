import { FileClock, FileCode2 } from "lucide-react";

type RecentFile = {
    id: string;
    path: string;
    project: string;
    updatedAt: string;
    language: string;
};

const recentFiles: RecentFile[] = [
    {
        id: "file-1",
        path: "src/components/editor/CollabPanel.tsx",
        project: "Obsidian Workspace",
        updatedAt: "6 min ago",
        language: "TypeScript",
    },
    {
        id: "file-2",
        path: "backend/ws_router.py",
        project: "Realtime Engine",
        updatedAt: "22 min ago",
        language: "Python",
    },
    {
        id: "file-3",
        path: "src/app/editor/[id]/page.tsx",
        project: "Web Client",
        updatedAt: "1 hr ago",
        language: "TypeScript",
    },
    {
        id: "file-4",
        path: "supabase/migrations/execution_history.sql",
        project: "Infra",
        updatedAt: "3 hr ago",
        language: "SQL",
    },
    {
        id: "file-5",
        path: "src/components/obsidian/Timeline.tsx",
        project: "Time Travel",
        updatedAt: "Yesterday",
        language: "TypeScript",
    },
];

export default function RecentFiles() {
    return (
        <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <FileClock className="h-5 w-5 text-blue-300" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Recent Files & Snippets
                    </h2>
                </div>
                <button
                    type="button"
                    className="text-xs uppercase tracking-[0.2em] text-blue-200 transition hover:text-blue-100"
                >
                    View Log
                </button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
                {recentFiles.map((file) => (
                    <div
                        key={file.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                    >
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{file.project}</span>
                            <span>{file.updatedAt}</span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-100">
                            {file.path}
                        </p>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-blue-200">
                            <FileCode2 className="h-3.5 w-3.5" />
                            {file.language}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
