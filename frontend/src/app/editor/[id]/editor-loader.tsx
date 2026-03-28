"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getDocument } from "@/lib/api";
import type { Document } from "@/types/database";

const CollaborativeEditor = dynamic(
  () => import("@/components/collaborative-editor"),
  { ssr: false }
);

interface EditorLoaderProps {
  documentId: string;
}

export default function EditorLoader({ documentId }: EditorLoaderProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const doc = await getDocument(documentId);
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
  }, [documentId]);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#f87171",
          fontFamily: "monospace",
          fontSize: "14px",
          gap: "8px",
        }}
      >
        <span>⚠</span>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <CollaborativeEditor
      documentId={documentId}
      language={document?.language ?? "python"}
    />
  );
}
