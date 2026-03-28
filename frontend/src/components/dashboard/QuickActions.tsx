"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Plus, Loader2, AlertCircle } from "lucide-react";
import { createDocument } from "@/lib/api";
import { useActiveDocument } from "@/components/providers/active-document-provider";

const LANGUAGES = [
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
];

export default function QuickActions() {
    const router = useRouter();
    const { setActiveDocumentId } = useActiveDocument();
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState(LANGUAGES[0].value);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!title.trim()) return;
        setIsCreating(true);
        setError(null);
        try {
            const doc = await createDocument({ title: title.trim(), language });
            setActiveDocumentId(doc.id);
            router.push("/workspace");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create document"
            );
            setIsCreating(false);
        }
    };

    return (
        <section className="rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Quick Actions
                </h2>
                <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </div>

            <div className="mt-4 space-y-3">
                {!showForm ? (
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-400 transition hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-300"
                    >
                        <Plus className="h-4 w-4" />
                        New File
                    </button>
                ) : (
                    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                        <label className="block space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Title
                            </span>
                            <input
                                type="text"
                                placeholder="File title…"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreate();
                                }}
                                autoFocus
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-blue-500"
                            />
                        </label>
                        <label className="block space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Language
                            </span>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-blue-500"
                            >
                                {LANGUAGES.map((lang) => (
                                    <option key={lang.value} value={lang.value}>
                                        {lang.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {error && (
                            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={isCreating || !title.trim()}
                                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-blue-500 disabled:opacity-50"
                            >
                                {isCreating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    "Create"
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setTitle("");
                                    setError(null);
                                }}
                                className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
