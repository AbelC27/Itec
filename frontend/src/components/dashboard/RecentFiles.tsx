"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileClock, FileCode2, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { getDocuments, deleteDocument } from "@/lib/api";
import type { Document } from "@/types/database";

const LANGUAGE_COLORS: Record<string, string> = {
    python: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    javascript: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    typescript: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function RecentFiles() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getDocuments();
                if (isMounted) setDocuments(data);
            } catch (err) {
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load documents"
                    );
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        load();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this document?")) return;

        setDeletingId(id);
        setError(null);
        try {
            await deleteDocument(id);
            setDocuments((prev) => prev.filter((doc) => doc.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete document");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <FileClock className="h-5 w-5 text-blue-300" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Recent Files &amp; Snippets
                    </h2>
                </div>
                <button
                    type="button"
                    className="text-xs uppercase tracking-[0.2em] text-blue-200 transition hover:text-blue-100"
                >
                    View Log
                </button>
            </div>

            <div className="mt-5 space-y-2">
                {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="uppercase tracking-[0.2em]">Loading documents…</span>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {!isLoading && !error && documents.length === 0 && (
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        No recent files yet.
                    </p>
                )}

                {documents.map((doc) => {
                    const langClass =
                        LANGUAGE_COLORS[doc.language] ??
                        "bg-slate-500/20 text-slate-300 border-slate-500/30";

                    return (
                        <button
                            key={doc.id}
                            type="button"
                            onClick={() => router.push(`/editor/${doc.id}`)}
                            className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition hover:border-slate-800 hover:bg-slate-900/60"
                        >
                            <FileCode2 className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="flex-1 truncate text-sm text-slate-200">
                                {doc.title}
                            </span>
                            <span
                                className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${langClass}`}
                            >
                                {doc.language}
                            </span>
                            <span className="text-[10px] tabular-nums text-slate-500">
                                {formatRelativeTime(doc.updated_at)}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => handleDelete(e, doc.id)}
                                disabled={deletingId === doc.id}
                                className="ml-2 rounded p-1.5 text-slate-500 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
                                title="Delete Document"
                            >
                                {deletingId === doc.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                )}
                            </button>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
