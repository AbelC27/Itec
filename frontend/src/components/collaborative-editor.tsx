"use client";

import { useRef, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useProfile } from "@/hooks/useProfile";
import { useYjsSupabase } from "@/hooks/useYjsSupabase";

interface CollaborativeEditorProps {
  documentId: string;
}

export default function CollaborativeEditor({ documentId }: CollaborativeEditorProps) {
  const { profile, isLoading } = useProfile();
  const bindingRef = useRef<MonacoBinding | null>(null);

  // Clean up binding on unmount
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, []);

  if (isLoading || !profile) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading…
      </div>
    );
  }

  return <EditorWithYjs documentId={documentId} profile={profile} bindingRef={bindingRef} />;
}

function EditorWithYjs({
  documentId,
  profile,
  bindingRef,
}: {
  documentId: string;
  profile: { id: string; username: string; avatar_color_hex: string };
  bindingRef: React.MutableRefObject<MonacoBinding | null>;
}) {
  const yjsState = useYjsSupabase(documentId, profile);

  // Store yjsState in a ref so the cleanup effect can access the latest value
  const yjsRef = useRef(yjsState);
  yjsRef.current = yjsState;

  // Clean up binding when yjsState changes (e.g., reconnect creates new doc)
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [yjsState, bindingRef]);

  if (!yjsState) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Connecting…
      </div>
    );
  }

  const handleEditorMount: OnMount = (editor) => {
    const state = yjsRef.current;
    if (!state) return;

    const yText = state.yDoc.getText("content");
    const model = editor.getModel();
    if (!model) return;

    bindingRef.current = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      state.awareness
    );
  };

  return (
    <div style={{ height: "100%" }}>
      <Editor
        height="100%"
        defaultLanguage="typescript"
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
        }}
      />
    </div>
  );
}
