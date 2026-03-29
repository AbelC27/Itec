"use client";

import { startTransition, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { getDocument, getActiveSessions, getExecutionTelemetryAlerts } from "@/lib/api";
import type { Document } from "@/types/database";
import type { ActiveSession, ExecutionTelemetryAlert } from "@/lib/api";
import { useActiveDocument } from "@/components/providers/active-document-provider";
import { useProfile } from "@/hooks/useProfile";
import VsCodeLinkBanner from "@/components/workspace/vscode-link-banner";
import ActiveSessions from "@/components/dashboard/ActiveSessions";
import { Skeleton } from "@/components/ui/skeleton";

const CollaborativeEditor = dynamic(
    () => import("@/components/collaborative-editor"),
    { ssr: false }
);

function TeacherLiveTelemetryDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [alerts, setAlerts] = useState<ExecutionTelemetryAlert[]>([]);
    const [sessionsError, setSessionsError] = useState<string | null>(null);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [obsDoc, setObsDoc] = useState<Document | null>(null);
    const [obsLoading, setObsLoading] = useState(false);

    // Persist selected session in URL so it survives refresh / navigation
    const selectedTelemetryId = searchParams.get("observe") ?? null;

    const setSelectedTelemetryId = useCallback(
        (id: string | null) => {
            const params = new URLSearchParams(searchParams.toString());
            if (id) {
                params.set("observe", id);
            } else {
                params.delete("observe");
            }
            router.replace(`/workspace?${params.toString()}`);
        },
        [searchParams, router]
    );

    useEffect(() => {
        let cancelled = false;

        async function tick() {
            try {
                const [s, a] = await Promise.all([
                    getActiveSessions(),
                    getExecutionTelemetryAlerts(),
                ]);
                if (!cancelled) {
                    setSessions(s);
                    setAlerts(a);
                    setSessionsError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setSessionsError(
                        err instanceof Error ? err.message : "Failed to load telemetry"
                    );
                }
            } finally {
                if (!cancelled) setLoadingSessions(false);
            }
        }

        void tick();
        const id = window.setInterval(() => void tick(), 8000);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, []);

    // Fetch document and poll for updates while observing
    useEffect(() => {
        if (!selectedTelemetryId) {
            setObsDoc(null);
            return;
        }
        let cancelled = false;
        setObsLoading(true);

        async function fetchDoc() {
            try {
                const d = await getDocument(selectedTelemetryId!);
                if (!cancelled) setObsDoc(d);
            } catch {
                if (!cancelled) setObsDoc(null);
            } finally {
                if (!cancelled) setObsLoading(false);
            }
        }

        void fetchDoc();

        // Poll every 5s so the teacher sees DB content even if Yjs isn't syncing
        const pollId = window.setInterval(() => {
            if (!cancelled) void fetchDoc();
        }, 5000);

        return () => {
            cancelled = true;
            window.clearInterval(pollId);
        };
    }, [selectedTelemetryId]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground mb-1">
                    Live Telemetry
                </h1>
                <p className="text-xs text-muted-foreground">
                    Active collaborative sessions and execution risk signals. Click a session to observe
                    the student IDE in read-only mode.
                </p>
            </div>

            {alerts.length > 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[11px] text-amber-100">
                    <p className="font-semibold uppercase tracking-widest text-amber-300 mb-2">
                        Repeated run failures
                    </p>
                    <ul className="space-y-1 list-disc list-inside">
                        {alerts.map((a) => (
                            <li key={`${a.session_id}-${a.consecutive_failures}`}>{a.message}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {selectedTelemetryId ? (
                <div className="rounded-2xl border border-border overflow-hidden bg-card">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-secondary/50 border-b border-border">
                        <span className="text-xs font-mono text-muted-foreground">
                            Observing session · {selectedTelemetryId.slice(0, 12)}…
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedTelemetryId(null)}
                            className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ← Back to sessions
                        </button>
                    </div>
                    {obsLoading || !obsDoc ? (
                        <div className="p-6 space-y-4">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-[60vh] w-full" />
                        </div>
                    ) : (
                        <div style={{ height: "calc(100vh - 12rem)", minHeight: "600px" }}>
                            <CollaborativeEditor
                                documentId={selectedTelemetryId}
                                language={obsDoc.language ?? "python"}
                                initialContent={obsDoc.content ?? ""}
                                readOnly
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                    <ActiveSessions
                        sessions={sessions}
                        isLoading={loadingSessions}
                        error={sessionsError}
                        onSelectSession={(s) => setSelectedTelemetryId(s.id)}
                    />
                </div>
            )}
        </div>
    );
}

export default function ObsidianWorkspacePage() {
    const { profile, isLoading: profileLoading } = useProfile();
    const { activeDocumentId, isReady } = useActiveDocument();
    const [document, setDocument] = useState<Document | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDocLoading, setIsDocLoading] = useState(false);

    useEffect(() => {
        if (!activeDocumentId) {
            startTransition(() => {
                setDocument(null);
                setError(null);
            });
            return;
        }

        let isMounted = true;
        startTransition(() => {
            setDocument(null);
            setError(null);
        });
        setIsDocLoading(true);

        const load = async () => {
            try {
                const doc = await getDocument(activeDocumentId);
                if (isMounted) setDocument(doc);
            } catch (err) {
                if (isMounted) {
                    setError(
                        err instanceof Error ? err.message : "Failed to load document"
                    );
                }
            } finally {
                if (isMounted) setIsDocLoading(false);
            }
        };

        void load();
        return () => {
            isMounted = false;
        };
    }, [activeDocumentId]);

    if (!isReady || profileLoading || !profile) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
                    Loading Workspace...
                </div>
            </div>
        );
    }

    if (profile.role === "teacher") {
        return (
            <div className="min-h-[calc(100vh-8rem)] px-4 py-6">
                <TeacherLiveTelemetryDashboard />
            </div>
        );
    }

    // Students: VS Code extension path — no in-browser collaborative editor
    if (!activeDocumentId) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-2xl border border-border bg-card">
                <div className="text-center space-y-4 max-w-md px-6">
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                        No Document Selected
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Choose a document from the Homepage, then open it in the iTECify VS Code
                        extension. Your teacher sees live telemetry from the web app; you edit in VS
                        Code.
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-2xl border border-destructive/50 bg-destructive/10">
                <div className="text-center space-y-4 text-destructive-foreground font-mono text-sm max-w-md px-6">
                    <span className="text-2xl">⚠</span>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (isDocLoading || !document) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <div className="space-y-4 w-full max-w-2xl px-6">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-[60vh] w-full" />
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: "calc(100vh - 8rem)" }} className="flex flex-col gap-4">
            <VsCodeLinkBanner
                documentId={activeDocumentId}
                title={document.title}
                content={document.content ?? ""}
            />
            <div className="flex-1 min-h-0">
                <CollaborativeEditor
                    documentId={activeDocumentId}
                    language={document.language ?? "python"}
                    initialContent={document.content ?? ""}
                />
            </div>
        </div>
    );
}
