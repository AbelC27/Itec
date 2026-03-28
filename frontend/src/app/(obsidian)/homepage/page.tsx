"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveDocument } from "@/components/providers/active-document-provider";
import { getDocuments, createDocument } from "@/lib/api";
import type { Document } from "@/types/database";
import { FileText, Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import InsightCard from "@/components/dashboard/InsightCard";
import RecentFiles from "@/components/dashboard/RecentFiles";
import ActiveSessions from "@/components/dashboard/ActiveSessions";
import ConnectedEnvironments from "@/components/dashboard/ConnectedEnvironments";
import QuickActions from "@/components/dashboard/QuickActions";

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
      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* DashboardHeader — full width */}
        <div className="col-span-full">
          <DashboardHeader userName={undefined} extensionConnected={false} />
        </div>

        {/* RecentFiles — spans 2 cols on lg */}
        <div className="lg:col-span-2">
          <RecentFiles />
        </div>

        {/* InsightCard */}
        <div>
          <InsightCard />
        </div>

        {/* ActiveSessions — spans 2 cols on lg */}
        <div className="lg:col-span-2">
          <ActiveSessions sessions={[]} isLoading={false} error={null} />
        </div>

        {/* QuickActions */}
        <div>
          <QuickActions />
        </div>

        {/* ConnectedEnvironments */}
        <div>
          <ConnectedEnvironments />
        </div>
      </div>

      {/* Workspace list header */}
      <header className="flex items-start justify-between rounded-2xl border border-white/10 bg-background p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Home</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">Your Workspaces</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Open an existing workspace or create a new one to start coding.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4" />
          Create Workspace
        </Button>
      </header>

      {/* Create Workspace Dialog */}
      <CreateWorkspaceModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={(doc) => {
          setActiveDocumentId(doc.id);
          router.push("/workspace");
        }}
      />

      {/* Loading — skeleton cards */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-background p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && documents.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-background p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">No workspaces yet</p>
          <Button
            className="mt-4"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4" />
            Create Workspace
          </Button>
        </div>
      )}

      {/* Workspace cards */}
      {!isLoading && !error && documents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => handleCardClick(doc)}
              className="group rounded-2xl border border-white/10 bg-background p-5 text-left transition-all duration-200 hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="truncate text-sm font-medium text-foreground">
                  {doc.title}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
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
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace to start coding.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ws-title" className="block text-xs text-muted-foreground">
              Title
            </label>
            <Input
              id="ws-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My project"
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="ws-language" className="block text-xs text-muted-foreground">
              Language
            </label>
            <Select
              value={language}
              onValueChange={(val) => setLanguage(val as "python" | "javascript")}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {modalError && (
            <p className="text-xs text-destructive">{modalError}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creating…" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
