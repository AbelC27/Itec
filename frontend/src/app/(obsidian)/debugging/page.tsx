"use client";

import { useState, useEffect } from "react";
import { useActiveDocument } from "@/components/providers/active-document-provider";
import { useHistory } from "@/hooks/useHistory";
import type { ExecutionHistoryEntry } from "@/types/execution-history";
import { Loader2, Copy, Check, AlertCircle, Clock, History } from "lucide-react";

export default function DebuggingPage() {
  const { activeDocumentId } = useActiveDocument();
  const [selectedEntry, setSelectedEntry] = useState<ExecutionHistoryEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // If no active document, show empty state
  if (!activeDocumentId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center space-y-3">
          <History className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">
            Please select a workspace from the Homepage to view its history.
          </p>
        </div>
      </div>
    );
  }

  return <DebuggingContent documentId={activeDocumentId} selectedEntry={selectedEntry} setSelectedEntry={setSelectedEntry} copied={copied} setCopied={setCopied} copyError={copyError} setCopyError={setCopyError} />;
}

function DebuggingContent({
  documentId,
  selectedEntry,
  setSelectedEntry,
  copied,
  setCopied,
  copyError,
  setCopyError,
}: {
  documentId: string;
  selectedEntry: ExecutionHistoryEntry | null;
  setSelectedEntry: (entry: ExecutionHistoryEntry | null) => void;
  copied: boolean;
  setCopied: (v: boolean) => void;
  copyError: boolean;
  setCopyError: (v: boolean) => void;
}) {
  const { history, isLoading, error } = useHistory(documentId);

  // 4.4: Clear selectedEntry when it's no longer in the history list
  useEffect(() => {
    if (selectedEntry && history.length > 0) {
      const stillExists = history.some((entry) => entry.id === selectedEntry.id);
      if (!stillExists) {
        setSelectedEntry(null);
      }
    }
  }, [history, selectedEntry, setSelectedEntry]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
      setCopied(false);
      setTimeout(() => setCopyError(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive-foreground text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left pane — History List */}
      <div className="w-80 shrink-0 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Execution History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No execution history yet.</p>
        ) : (
          <div className="space-y-1">
            {history.map((entry) => {
              const isSelected = selectedEntry?.id === entry.id;
              const hasFailed = !!entry.stderr && entry.stderr.trim().length > 0;
              const timestamp = new Date(entry.created_at).toLocaleString();

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                  className={`w-full text-left px-3 py-3 rounded-lg cursor-pointer transition-all duration-150 hover:bg-accent ${
                    isSelected
                      ? "bg-accent border border-border"
                      : "border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{timestamp}</span>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        hasFailed
                          ? "text-red-400 bg-red-950/40"
                          : "text-emerald-400 bg-emerald-950/40"
                      }`}
                    >
                      {hasFailed ? "Failed" : "Success"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {entry.execution_time.toFixed(2)}s
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right pane — Snapshot View */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-5">
        {!selectedEntry ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Select an entry to view details</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Code Snapshot */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Code Snapshot
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopyCode(selectedEntry.code_snapshot)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded border border-border hover:border-muted-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      Copied!
                    </>
                  ) : copyError ? (
                    <>
                      <AlertCircle className="h-3 w-3 text-red-400" />
                      Copy failed
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
              <pre className="font-mono text-[13px] text-foreground whitespace-pre-wrap bg-secondary/50 rounded-lg p-4">
                {selectedEntry.code_snapshot}
              </pre>
            </div>

            {/* Stdout */}
            {selectedEntry.stdout && selectedEntry.stdout.trim().length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Output
                </h3>
                <pre className="font-mono text-[13px] text-muted-foreground whitespace-pre-wrap bg-secondary/50 rounded-lg p-3">
                  {selectedEntry.stdout}
                </pre>
              </div>
            )}

            {/* Stderr */}
            {selectedEntry.stderr && selectedEntry.stderr.trim().length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Errors
                </h3>
                <pre className="font-mono text-[13px] text-red-400 bg-destructive/10 border border-destructive/30 rounded-lg p-3 whitespace-pre-wrap">
                  {selectedEntry.stderr}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
