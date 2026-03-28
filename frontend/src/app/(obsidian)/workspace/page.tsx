"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getDocument } from "@/lib/api";
import type { Document } from "@/types/database";
import { useActiveDocument } from "@/components/providers/active-document-provider";
import VsCodeLinkBanner from "@/components/workspace/vscode-link-banner";

// Dynamically import the collaborative editor to prevent SSR issues
const CollaborativeEditor = dynamic(
    () => import("@/components/collaborative-editor"),
    { ssr: false }
);

export default function ObsidianWorkspacePage() {
    const { activeDocumentId, isReady } = useActiveDocument();
    const [document, setDocument] = useState<Document | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSnapshotChange = useCallback((content: string) => {
        setDocument((current) => (
            current
                ? {
                    ...current,
                    content,
                }
                : current
        ));
    }, []);

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
            }
        };

        load();
        return () => {
            isMounted = false;
        };
    }, [activeDocumentId]);

    if (!isReady) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <div className="text-sm uppercase tracking-[0.2em] text-slate-500 animate-pulse">
                    Loading Workspace...
                </div>
            </div>
        );
    }

    // If no document is selected, show an empty state prompting the user
    if (!activeDocumentId) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-2xl border border-slate-900 bg-slate-950/50">
                <div className="text-center space-y-4">
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                        No Document Selected
                    </p>
                    <p className="text-xs text-slate-400">
                        Please select a document from the Homepage to start collaborating.
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-2xl border border-red-900/50 bg-slate-950/50">
                <div className="text-center space-y-4 text-red-400 font-mono text-sm max-w-md px-6">
                    <span className="text-2xl">⚠</span>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!document) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <div className="text-sm uppercase tracking-[0.2em] text-slate-500 animate-pulse">
                    Loading Document...
                </div>
            </div>
        );
    }

    // Pass the documentId to the editor once loaded
    return (
        <div style={{ height: "calc(100vh - 8rem)" }}>
            <VsCodeLinkBanner
                documentId={activeDocumentId}
                title={document.title}
                content={document.content ?? ""}
            />
            <CollaborativeEditor
                documentId={activeDocumentId}
                language={document.language ?? "python"}
                initialContent={document.content ?? ""}
                onSnapshotChange={handleSnapshotChange}
            />
        </div>
    );
}
