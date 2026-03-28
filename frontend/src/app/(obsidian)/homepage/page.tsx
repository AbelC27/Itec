"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveDocument } from "@/components/providers/active-document-provider";
import { getDocuments, createDocument } from "@/lib/api";
import type { Document } from "@/types/database";
import { FileText, Plus, X, Loader2 } from "lucide-react";

export default function ObsidianHomePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { setActiveDocumentId } = useActiveDocument();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function fetchDocs() {
      try {
        setIsLoading(true);
        setError(null);
        const docs = await getDocuments();
        if (!cancelled) setDocuments(docs);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load documents");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchDocs();
    return () => { cancelled = true; };
  }, []);

  function handleCardClick(doc: Document) {
    setActiveDocumentId(doc.id);
    router.push("/workspace");
  }

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between rounded-2xl border border-slate-900 bg-slate-950/80 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Home</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-100">Your Workspaces</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Open an existing workspace or create a new one to start coding.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg border border-blue-900/60 bg-blue-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100 transition hover:bg-blue-900/60"
        >
          <Plus className="h-4 w-4" />
          Create Workspace
        </button>
      </header>

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(doc) => {
            setActiveDocumentId(doc.id);
            router.push("/workspace");
          }}
        />
      )}

      {isLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-900 bg-slate-950/80 p-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-3 text-sm text-slate-400">Loading workspaces…</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-6 text-sm text-red-300">
          {error}
        </div>
      )}

      {!isLoading && !error && documents.length === 0 && (
        <div className="rounded-2xl border border-slate-900 bg-slate-950/80 p-12 text-center text-sm text-slate-500">
          No workspaces yet. Create one to get started.
        </div>
      )}

      {!isLoading && !error && documents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => handleCardClick(doc)}
              className="group rounded-2xl border border-slate-900 bg-slate-950/80 p-5 text-left transition hover:border-slate-700 hover:bg-slate-900/60"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-300" />
                <span className="truncate text-sm font-medium text-slate-100">
                  {doc.title}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">
                {doc.language}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function CreateWorkspaceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (doc: Document) => void;
}) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      setModalError(null);
      const doc = await createDocument({ title: title.trim(), language });
      onCreated(doc);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">New Workspace</h2>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="ws-title" className="block text-xs text-slate-400">
            Title
          </label>
          <input
            id="ws-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My project"
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-800"
          />
        </div>

        <div>
          <label htmlFor="ws-language" className="block text-xs text-slate-400">
            Language
          </label>
          <select
            id="ws-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "python" | "javascript")}
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-800"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>

        {modalError && (
          <p className="text-xs text-red-400">{modalError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Creating…" : "Create"}
        </button>
      </form>
    </div>
  );
}
