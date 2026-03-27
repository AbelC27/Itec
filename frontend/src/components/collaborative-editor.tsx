"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useProfile } from "@/hooks/useProfile";
import { useYjsSupabase } from "@/hooks/useYjsSupabase";
import type * as monaco from "monaco-editor";

interface CollaborativeEditorProps {
  documentId: string;
}

export default function CollaborativeEditor({
  documentId,
}: CollaborativeEditorProps) {
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading…
      </div>
    );
  }

  return <EditorWithYjs documentId={documentId} profile={profile} />;
}

function EditorWithYjs({
  documentId,
  profile,
}: {
  documentId: string;
  profile: { id: string; username: string; avatar_color_hex: string };
}) {
  const yjsState = useYjsSupabase(documentId, profile);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Create binding when BOTH editor and yjsState are ready
  // Recreate when either changes
  useEffect(() => {
    if (!yjsState || !editor) return;

    const yText = yjsState.yDoc.getText("content");
    const model = editor.getModel();
    if (!model) return;

    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      yjsState.awareness
    );
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [yjsState, editor]);

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    setEditor(editorInstance);
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "4px 12px", fontSize: 12, background: yjsState?.isConnected ? "#22c55e" : "#ef4444", color: "#fff" }}>
        {!yjsState ? "Initializing…" : yjsState.isConnected ? `Connected — Room: itecify-${documentId}` : "Disconnected — waiting for server on ws://localhost:4444"}
      </div>
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="typescript"
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
          }}
        />
      </div>
    </div>
  );
}
