"use client";

import dynamic from "next/dynamic";

const CollaborativeEditor = dynamic(
  () => import("@/components/collaborative-editor"),
  { ssr: false }
);

interface EditorLoaderProps {
  documentId: string;
}

export default function EditorLoader({ documentId }: EditorLoaderProps) {
  return <CollaborativeEditor documentId={documentId} />;
}
