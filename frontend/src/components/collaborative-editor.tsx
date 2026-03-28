"use client";

import { useRef, useEffect, useCallback, useState, type KeyboardEvent } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useProfile } from "@/hooks/useProfile";
import { useYjsSupabase } from "@/hooks/useYjsSupabase";
import { useExecution } from "@/hooks/useExecution";
import { useHistory } from "@/hooks/useHistory";
import {
  sendAiChat,
  ApiError,
  pullDocumentContent,
  pushDocumentContent,
} from "../lib/api";
import {getChatSessions, createChatSession, deleteChatSession, getChatMessages, saveChatMessage } from "../lib/api";
import type { AiChatSession } from "../lib/api";
import type * as monaco from "monaco-editor";
import {
  Loader2, Play, X, Minus, ChevronRight, Plus, Paperclip,
  Mic, Send, Wand2, RotateCcw, Bot, Download, Upload,
} from "lucide-react";

/** Extract code blocks from markdown-formatted AI replies. */
function parseMessageParts(content: string): { type: "text" | "code"; value: string }[] {
  const parts: { type: "text" | "code"; value: string }[] = [];
  const regex = /```[\w]*\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index).trim() });
    }
    parts.push({ type: "code", value: match[1].trim() });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) parts.push({ type: "text", value: remaining });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: content }];
}

interface CollaborativeEditorProps {
  documentId: string;
  language?: string;
  initialContent?: string;
  onSnapshotChange?: (content: string) => void;
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

type CloudSyncState =
  | "synced"
  | "dirty"
  | "pushing"
  | "pulling"
  | "conflict"
  | "error";

export default function CollaborativeEditor({
  documentId,
  language = "python",
  initialContent = "",
  onSnapshotChange,
}: CollaborativeEditorProps) {
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground font-sans">
        Loading...
      </div>
    );
  }

  return (
    <EditorWithYjs
      key={documentId}
      documentId={documentId}
      profile={profile}
      language={language}
      initialContent={initialContent}
      onSnapshotChange={onSnapshotChange}
    />
  );
}

function EditorWithYjs({
  documentId,
  profile,
  language,
  initialContent,
  onSnapshotChange,
}: {
  documentId: string;
  profile: { id: string; username: string; avatar_color_hex: string };
  language: string;
  initialContent: string;
  onSnapshotChange?: (content: string) => void;
}) {
  const yjsState = useYjsSupabase(documentId, profile);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const applyCloudContentRef = useRef<(nextContent: string) => void>(() => {});
  const hasSeededInitialContentRef = useRef(false);
  const lastCloudContentRef = useRef(initialContent);
  const isApplyingCloudContentRef = useRef(false);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [code, setCode] = useState("");
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>("synced");
  const [cloudSyncMessage, setCloudSyncMessage] = useState("Cloud snapshot ready.");
  const [terminalLines] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"Terminal" | "History">("Terminal");

  // ── Chat sessions state ────────────────────────────────────────────
  const [chatSessions, setChatSessions] = useState<AiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Load chat sessions on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessions = await getChatSessions(documentId);
        if (cancelled) return;
        setChatSessions(sessions);
        if (sessions.length > 0) {
          setActiveSessionId(sessions[0].id);
        }
      } catch {
        // Silently fail — sessions just won't load
      } finally {
        if (!cancelled) setIsLoadingSessions(false);
      }
    })();
    return () => { cancelled = true; };
  }, [documentId]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) {
      setChatMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const messages = await getChatMessages(activeSessionId);
        if (cancelled) return;
        setChatMessages(
          messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date(m.created_at).getTime(),
          }))
        );
      } catch {
        if (!cancelled) setChatMessages([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activeSessionId]);

  const handleNewChat = useCallback(async () => {
    try {
      const session = await createChatSession(documentId);
      setChatSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setChatMessages([]);
    } catch {
      // Silently fail
    }
  }, [documentId]);

  const handleDeleteChat = useCallback(async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId);
      setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setChatMessages([]);
      }
    } catch {
      // Silently fail
    }
  }, [activeSessionId]);

  // Hook up history
  const historyHook = useHistory(documentId);

  // Execution hook
  const execution = useExecution(documentId);

  // Confetti easter egg
  useEffect(() => {
    if (!execution.easterEggTriggered) return;
    (async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti();
      } catch {
        // non-critical — silently swallow
      }
    })();
  }, [execution.easterEggTriggered]);

  useEffect(() => {
    hasSeededInitialContentRef.current = false;
    applyCloudContentRef.current = () => {};
    setCloudSyncState("synced");
    setCloudSyncMessage("Cloud snapshot ready.");
  }, [documentId]);

  useEffect(() => {
    lastCloudContentRef.current = initialContent;
    setCloudSyncState("synced");
    setCloudSyncMessage("Cloud snapshot ready.");
  }, [initialContent]);

  // Create binding when BOTH editor and yjsState are ready
  // Recreate when either changes
  useEffect(() => {
    if (!yjsState || !editor) return;

    const yText = yjsState.yDoc.getText("content");
    const model = editor.getModel();
    if (!model) return;

    // Tear down any existing binding first to prevent duplicates on HMR
    if (bindingRef.current) {
      try {
        bindingRef.current.destroy();
      } catch {
        // Ignore teardown errors
      }
      bindingRef.current = null;
    }

    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      yjsState.awareness
    );
    bindingRef.current = binding;

    return () => {
      if (bindingRef.current !== binding) return;
      bindingRef.current = null;
      try {
        binding.destroy();
      } catch {
        // Ignore teardown errors from yjs during rapid unmounts.
      }
    };
  }, [yjsState, editor]);

  useEffect(() => {
    if (!yjsState) return;

    const provider = yjsState.provider;
    const yDoc = yjsState.yDoc;
    const yText = yDoc.getText("content");

    const applyCloudContent = (nextContent: string) => {
      if (nextContent === yText.toString()) {
        lastCloudContentRef.current = nextContent;
        setCode(nextContent);
        setCloudSyncState("synced");
        setCloudSyncMessage("Cloud snapshot ready.");
        return;
      }

      isApplyingCloudContentRef.current = true;
      yDoc.transact(() => {
        yText.delete(0, yText.length);
        if (nextContent) {
          yText.insert(0, nextContent);
        }
      }, "cloud-sync");
      isApplyingCloudContentRef.current = false;
      lastCloudContentRef.current = nextContent;
      setCode(nextContent);
      setCloudSyncState("synced");
      setCloudSyncMessage("Cloud snapshot ready.");
    };
    applyCloudContentRef.current = applyCloudContent;

    const ensureInitialContent = () => {
      if (hasSeededInitialContentRef.current) {
        return;
      }

      hasSeededInitialContentRef.current = true;

      if (yText.length > 0) {
        const nextContent = yText.toString();
        setCode(nextContent);
        if (nextContent === lastCloudContentRef.current) {
          setCloudSyncState("synced");
          setCloudSyncMessage("Cloud snapshot ready.");
        } else {
          setCloudSyncState("dirty");
          setCloudSyncMessage("Local collaborative changes are not pushed yet.");
        }
        return;
      }

      applyCloudContent(initialContent);
    };

    const handleYTextChange = () => {
      const nextContent = yText.toString();
      setCode(nextContent);

      if (isApplyingCloudContentRef.current) {
        return;
      }

      if (nextContent === lastCloudContentRef.current) {
        setCloudSyncState("synced");
        setCloudSyncMessage("Cloud snapshot ready.");
        return;
      }

      setCloudSyncState("dirty");
      setCloudSyncMessage("Local collaborative changes are not pushed yet.");
    };

    const handleProviderSync = (isSynced: boolean) => {
      if (isSynced) {
        ensureInitialContent();
      }
    };

    yText.observe(handleYTextChange);
    provider.on("sync", handleProviderSync);
    ensureInitialContent();

    return () => {
      yText.unobserve(handleYTextChange);
      provider.off("sync", handleProviderSync);
      applyCloudContentRef.current = () => {};
    };
  }, [initialContent, yjsState]);

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    setEditor(editorInstance);
  }, []);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (newCode === code) {
        return;
      }
      setCode(newCode);
    },
    [code]
  );

  const handleMonacoChange = useCallback(
    (value?: string) => {
      if (typeof value !== "string") {
        return;
      }
      handleCodeChange(value);
    },
    [handleCodeChange]
  );

  const handlePushToCloud = useCallback(async () => {
    if (!yjsState) {
      setCloudSyncState("error");
      setCloudSyncMessage("Editor sync is still connecting.");
      return;
    }

    const nextContent = editor?.getValue() ?? code;
    if (nextContent === lastCloudContentRef.current) {
      setCloudSyncState("synced");
      setCloudSyncMessage("Nothing new to push.");
      return;
    }

    setCloudSyncState("pushing");
    setCloudSyncMessage("Pushing local changes to the cloud...");

    try {
      await pushDocumentContent(
        documentId,
        nextContent,
        lastCloudContentRef.current
      );
      lastCloudContentRef.current = nextContent;
      setCloudSyncState("synced");
      setCloudSyncMessage("Cloud snapshot updated.");
      onSnapshotChange?.(nextContent);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setCloudSyncState("conflict");
        setCloudSyncMessage("Remote snapshot changed. Pull before pushing again.");
        return;
      }

      setCloudSyncState("error");
      setCloudSyncMessage(
        err instanceof Error ? err.message : "Failed to push changes to the cloud."
      );
    }
  }, [code, documentId, editor, onSnapshotChange, yjsState]);

  const handlePullFromCloud = useCallback(async () => {
    if (!yjsState) {
      setCloudSyncState("error");
      setCloudSyncMessage("Editor sync is still connecting.");
      return;
    }

    const currentContent = editor?.getValue() ?? code;
    if (
      currentContent !== lastCloudContentRef.current &&
      !window.confirm(
        "Pulling will replace your local editor changes with the cloud snapshot. Continue?"
      )
    ) {
      return;
    }

    setCloudSyncState("pulling");
    setCloudSyncMessage("Pulling the latest cloud snapshot...");

    try {
      const { content } = await pullDocumentContent(documentId);
      hasSeededInitialContentRef.current = true;
      applyCloudContentRef.current(content);
      lastCloudContentRef.current = content;
      setCloudSyncState("synced");
      setCloudSyncMessage("Cloud snapshot pulled.");
      onSnapshotChange?.(content);
    } catch (err) {
      setCloudSyncState("error");
      setCloudSyncMessage(
        err instanceof Error ? err.message : "Failed to pull changes from the cloud."
      );
    }
  }, [code, documentId, editor, onSnapshotChange, yjsState]);

  const handleRunCode = useCallback(() => {
    const currentCode = editor?.getValue() ?? code;
    if (!currentCode.trim()) return;

    // Switch to terminal tab
    setActiveTab("Terminal");
    execution.execute(language, currentCode);

    // Refresh history after a short delay to let the execution finish
    // A better approach would be to wait for the complete event, but this works for now
    setTimeout(() => {
      historyHook.refresh();
    }, 2000);
  }, [editor, code, language, execution, historyHook]);

  const handleSendChat = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    // Auto-create a session if none exists
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await createChatSession(documentId, trimmed.slice(0, 40));
        setChatSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        sessionId = session.id;
      } catch {
        // Can't create session — fall back to local-only
      }
    }

    const now = Date.now();
    const userMessage: ChatMessage = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${now}-user`,
      role: "user",
      content: trimmed,
      createdAt: now,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsSending(true);

    // Persist user message to DB
    if (sessionId) {
      saveChatMessage(sessionId, "user", trimmed).catch(() => {});
    }

    try {
      const history = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { reply } = await sendAiChat({
        message: trimmed,
        code: editor?.getValue() ?? code,
        history,
      });

      const assistantMessage: ChatMessage = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-assistant`,
        role: "assistant",
        content: reply,
        createdAt: Date.now(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);

      // Persist assistant message to DB
      if (sessionId) {
        saveChatMessage(sessionId, "assistant", reply).catch(() => {});
      }
    } catch (err) {
      const errorContent =
        err instanceof ApiError
          ? "AI service is currently unavailable."
          : err instanceof TypeError
            ? "Could not reach the AI service. Check your connection."
            : "AI service is currently unavailable.";

      const errorMessage: ChatMessage = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-assistant`,
        role: "assistant",
        content: errorContent,
        createdAt: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  }, [chatInput, editor, code, activeSessionId, documentId, chatMessages]);

  const handleChatKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSendChat();
      }
    },
    [handleSendChat]
  );

  // Determine terminal content: execution output takes priority when running/has output
  const hasExecutionOutput = execution.output || execution.error;
  const showExecutionOutput = execution.isRunning || hasExecutionOutput;
  const isSyncReady = Boolean(yjsState);
  const isSyncBusy =
    cloudSyncState === "pushing" || cloudSyncState === "pulling";
  const cloudSyncAccent =
    cloudSyncState === "synced"
      ? "#34d399"
      : cloudSyncState === "dirty"
        ? "#60a5fa"
        : cloudSyncState === "conflict"
          ? "#60a5fa"
          : cloudSyncState === "error"
            ? "#f87171"
            : "#60a5fa";
  const cloudSyncLabel =
    cloudSyncState === "synced"
      ? "Cloud synced"
      : cloudSyncState === "dirty"
        ? "Local changes"
        : cloudSyncState === "conflict"
          ? "Pull required"
          : cloudSyncState === "error"
            ? "Sync error"
            : cloudSyncState === "pushing"
              ? "Pushing"
              : "Pulling";

  return (
    <div className="min-h-screen flex flex-col bg-background text-muted-foreground font-sans">
      <main className="flex flex-1 min-h-0 overflow-hidden">
        <section className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
          {/* ── Status Bar ─────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 px-6 py-2.5 bg-secondary/60 border-b border-border">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
                {execution.isScanning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <strong>AI Scanning...</strong>
                  </>
                ) : execution.aiResources ? (
                  <>
                    <span>CPU:</span>
                    <strong className="text-blue-400">{execution.aiResources.cpu}</strong>
                    <span className="ml-1">RAM:</span>
                    <strong className="text-blue-400">{execution.aiResources.ram}</strong>
                  </>
                ) : (
                  <span>AI: Idle</span>
                )}
              </div>
              {execution.executionTime !== null && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
                  <span>EXEC TIME:</span>
                  <strong className="text-purple-400">
                    {execution.executionTime.toFixed(2)}s
                  </strong>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
                <span>LATENCY:</span>
                <strong className="text-purple-400">~14ms</strong>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-lg" title={cloudSyncMessage}>
                <span>SYNC:</span>
                <strong style={{ color: cloudSyncAccent }}>{cloudSyncLabel}</strong>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePullFromCloud}
                disabled={!isSyncReady || isSyncBusy}
                className="flex items-center gap-1.5 border-none rounded-lg px-4 py-2 text-[11px] uppercase tracking-widest font-extrabold bg-slate-800 text-slate-200 cursor-pointer transition-all duration-150 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
                title={cloudSyncMessage}
              >
                {cloudSyncState === "pulling" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {cloudSyncState === "pulling" ? "Pulling..." : "Pull"}
              </button>
              <button
                type="button"
                onClick={handlePushToCloud}
                disabled={!isSyncReady || isSyncBusy || cloudSyncState === "synced"}
                className={`flex items-center gap-1.5 border-none rounded-lg px-4 py-2 text-[11px] uppercase tracking-widest font-extrabold text-slate-50 cursor-pointer transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${
                  cloudSyncState === "conflict"
                    ? "bg-blue-700 hover:bg-blue-600"
                    : cloudSyncState === "dirty"
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "bg-teal-700 hover:bg-teal-600"
                }`}
                title={cloudSyncMessage}
              >
                {cloudSyncState === "pushing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {cloudSyncState === "pushing" ? "Pushing..." : "Push"}
              </button>
              <button
                type="button"
                onClick={handleRunCode}
                disabled={execution.isRunning}
                className="flex items-center gap-1.5 border-none rounded-lg px-4 py-2 text-[11px] uppercase tracking-widest font-extrabold bg-primary text-primary-foreground cursor-pointer transition-all duration-150 hover:shadow-[0_0_20px_rgba(250,250,250,0.15)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {execution.isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {execution.isRunning ? "Running…" : "Run"}
              </button>
              <button type="button" className="border-none bg-transparent text-muted-foreground p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-secondary hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ── Tab Bar ───────────────────────────────────── */}
          <div className="flex border-b border-border bg-secondary/40 overflow-x-auto">
            <span className="flex items-center gap-2 px-4 py-3 text-[11px] font-mono text-muted-foreground border-r border-border">
              {language.charAt(0).toUpperCase() + language.slice(1)} — {documentId.slice(0, 8)}
            </span>
          </div>

          {/* ── Editor Surface ────────────────────────────── */}
          <div className="flex-1 relative bg-background">
            <div className="absolute inset-0">
              <Editor
                height="100%"
                defaultLanguage={language}
                onMount={handleEditorMount}
                onChange={handleMonacoChange}
                options={{
                  minimap: { enabled: false },
                  quickSuggestions: true,
                  suggestOnTriggerCharacters: true,
                  parameterHints: { enabled: true },
                  wordBasedSuggestions: "currentDocument",
                  autoClosingBrackets: "always",
                  autoClosingQuotes: "always",
                  autoIndent: "full",
                  formatOnPaste: true,
                  formatOnType: true,
                  tabCompletion: "on",
                }}
              />
            </div>
          </div>

          {/* ── Security Alert ────────────────────────────── */}
          {execution.securityAlert && (
            <div className="bg-red-500 text-white px-4 py-2.5 text-xs font-mono font-semibold">
              {execution.securityAlert}
            </div>
          )}

          {/* ── Terminal / History Panel ──────────────────── */}
          <div className="h-60 flex flex-col border-t border-border bg-background/70 backdrop-blur-xl">
            <div className="flex items-center gap-4 px-4 py-2 text-[10px] font-extrabold tracking-widest uppercase bg-secondary/60">
              <span
                className={`cursor-pointer pb-0.5 ${activeTab === "Terminal" ? "text-blue-400 border-b-2 border-blue-400" : "text-muted-foreground"}`}
                onClick={() => setActiveTab("Terminal")}
              >
                Terminal
              </span>
              <span
                className={`cursor-pointer pb-0.5 ${activeTab === "History" ? "text-blue-400 border-b-2 border-blue-400" : "text-muted-foreground"}`}
                onClick={() => setActiveTab("History")}
              >
                History {historyHook.history.length > 0 ? `(${historyHook.history.length})` : ""}
              </span>
              <span className="text-muted-foreground">Debug Console</span>
              {activeTab === "Terminal" && showExecutionOutput && (
                <button
                  type="button"
                  onClick={execution.clear}
                  className="ml-2 text-[10px] text-muted-foreground cursor-pointer bg-transparent border-none uppercase tracking-widest hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
              <span className="ml-auto text-muted-foreground">
                <Minus className="h-4 w-4" />
              </span>
              <span className="text-muted-foreground">
                <X className="h-4 w-4" />
              </span>
            </div>

            <div className="flex-1 p-4 overflow-auto text-[11px] font-mono text-emerald-400 bg-background/70">
              {showExecutionOutput ? (
                <div className="mt-2">
                  {execution.output && (
                    <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs text-slate-200 opacity-85">
                      {execution.output}
                    </pre>
                  )}
                  {execution.error && (
                    <div className="mt-2 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                      ⚠ {execution.error}
                    </div>
                  )}
                  {execution.isRunning && (
                    <div className="mt-2 text-blue-400 text-[11px] font-mono flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Executing…
                    </div>
                  )}
                  {!execution.isRunning && execution.executionTime !== null && (
                    <div className={`mt-2 text-[11px] font-mono ${execution.exitCode === 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {execution.exitCode === 0 ? "✓ Completed in " : "✗ Failed after "}
                      {execution.executionTime.toFixed(3)}s
                    </div>
                  )}

                  {!execution.isRunning && execution.exitCode !== null && execution.exitCode > 0 && (
                    <div className="mt-3">
                      {!execution.aiExplanation && !execution.isExplaining && (
                        <button
                          type="button"
                          onClick={() => execution.explainWithAI(language, editor?.getValue() ?? code)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-mono cursor-pointer transition-all duration-200 hover:bg-purple-500/25"
                        >
                          <span>🤖</span> Explain with AI
                        </button>
                      )}

                      {execution.isExplaining && (
                        <div className="text-purple-300 text-[11px] font-mono flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Analyzing error…
                        </div>
                      )}

                      {execution.aiExplanation && (
                        <div className="mt-2 p-3 rounded-md bg-purple-500/5 border border-purple-500/20 text-purple-200 text-xs leading-relaxed font-sans whitespace-pre-wrap">
                          <div className="text-[10px] uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-1">
                            <span>🤖</span> AI Explanation
                          </div>
                          {execution.aiExplanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : terminalLines.length > 0 ? (
                <div className="opacity-70 mt-2">
                  {terminalLines.map((line, index) => (
                    <div key={`${index}-${line}`}>{line}</div>
                  ))}
                </div>
              ) : (
                <div className="opacity-70 mt-2">
                  <div>No terminal output yet.</div>
                </div>
              )}
              {activeTab === "Terminal" && (
                <div className="flex items-center gap-1.5 mt-3">
                  <span className="text-muted-foreground">~/architect/neural_core</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    placeholder="Awaiting architect command..."
                    type="text"
                    className="flex-1 border-none bg-transparent text-foreground font-mono text-[11px] outline-none"
                  />
                </div>
              )}
            </div>

            {activeTab === "History" && (
              <div className="flex-1 p-4 overflow-y-auto max-h-full text-[11px] font-mono text-emerald-400 bg-background/70">
                {historyHook.isLoading ? (
                  <div className="opacity-70 mt-2">Loading history...</div>
                ) : historyHook.error ? (
                  <div className="text-red-400 mt-2">⚠ {historyHook.error}</div>
                ) : historyHook.history.length === 0 ? (
                  <div className="opacity-70 mt-2">No execution history yet.</div>
                ) : (
                  <div className="flex flex-col gap-2 mt-2">
                    {historyHook.history.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-2.5 rounded bg-secondary/40 border border-border flex justify-between items-center"
                      >
                        <div>
                          <div className={`text-xs font-mono mb-1 ${entry.stderr ? "text-red-400" : "text-emerald-400"}`}>
                            {entry.stderr ? "✗ Failed" : "✓ Success"} • {new Date(entry.created_at).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {entry.execution_time.toFixed(2)}s • {entry.language}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (editor && confirm("Restore this code snapshot? Current editor contents will be overwritten.")) {
                              editor.setValue(entry.code_snapshot);
                            }
                          }}
                          className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] uppercase cursor-pointer transition-all duration-200 hover:bg-blue-500/20"
                        >
                          Restore Code
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </section>

        {/* ── AI Chat Panel ──────────────────────────────── */}
        <aside className="w-80 flex flex-col border-l border-border bg-background/70 backdrop-blur-xl max-lg:hidden">
          {/* Chat session tabs */}
          <div className="px-3 py-2 border-b border-border flex flex-col gap-1 max-h-[140px] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-bold">
                Chats
              </span>
              <button
                type="button"
                onClick={handleNewChat}
                className="bg-transparent border border-blue-500/30 rounded px-1.5 py-0.5 text-blue-400 text-[10px] cursor-pointer flex items-center gap-0.5 hover:bg-blue-500/10 transition-colors"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            </div>
            {isLoadingSessions ? (
              <span className="text-[10px] text-muted-foreground/60">Loading…</span>
            ) : chatSessions.length === 0 ? (
              <span className="text-[10px] text-muted-foreground/60">No chats yet. Send a message to start.</span>
            ) : (
              chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer text-[10px] transition-all duration-150 ${
                    activeSessionId === session.id
                      ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                      : "bg-transparent border border-transparent text-muted-foreground hover:bg-secondary"
                  }`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                    {session.title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(session.id);
                    }}
                    className="bg-transparent border-none text-muted-foreground/50 cursor-pointer p-0 leading-none shrink-0 hover:text-red-400 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* AI Header */}
          <div className="p-6 border-b border-border flex flex-col items-center gap-4">
            <div className="relative w-24 h-24 rounded-full border-4 border-blue-500/20 p-1.5 overflow-hidden">
              <img
                alt="AI Avatar"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYjJj3xmWNxsfNv-m0aOn2bsxrnEL3iuAD_V4xFEQ8RcaT2AkNLE23zaIJYFBO6rhSR6IQsJOU5psJvf3zpjwr8XSxqeq2YBs-1muiDxq-SXjC_aWLcZezZBabV7yfw4vu6zsT-Ad1u6uaqXDL2ZUw985HG4CSPssY4RYwjNF8oTZIANgsHpzEc6RLT4feLAGTekgH-BKVmH0s7fM2G1dfyeCXCDUDqZSDXVRf7RO0RMTHTvXzKe94Dshsm8pYz5C3qJS_5hHP-yY"
                className="w-full h-full object-cover rounded-full saturate-50 hover:saturate-100 transition-all duration-300"
              />
              <div className="absolute bottom-0.5 right-0.5 w-4.5 h-4.5 rounded-full bg-emerald-400 border-[3px] border-background" />
            </div>
            <div className="text-center">
              <div className="text-[11px] font-extrabold tracking-[0.22em] uppercase">iTECity AI</div>
              <div className="text-[10px] font-mono text-emerald-400 tracking-widest">STATUS: READY</div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
            {chatMessages.length === 0 ? (
              <div className="max-w-[95%] p-3 rounded-2xl text-xs leading-relaxed border border-border">No messages yet.</div>
            ) : (
              chatMessages.map((message) => {
                const isUser = message.role === "user";
                const parts = isUser ? null : parseMessageParts(message.content);

                return (
                  <div
                    key={message.id}
                    className={`max-w-[95%] p-3 rounded-2xl text-xs leading-relaxed border ${
                      isUser
                        ? "ml-auto bg-secondary border-border"
                        : "bg-blue-950/30 border-blue-500/20"
                    }`}
                  >
                    {isUser || !parts ? (
                      message.content
                    ) : (
                      parts.map((part, i) =>
                        part.type === "text" ? (
                          <span key={i} className="whitespace-pre-wrap">{part.value}</span>
                        ) : (
                          <div key={i} className="my-1.5">
                            <pre className="m-0 p-2 rounded-md bg-background/80 border border-border text-[11px] font-mono text-slate-200 whitespace-pre-wrap break-words overflow-x-auto">
                              {part.value}
                            </pre>
                            <button
                              type="button"
                              onClick={() => {
                                if (editor) {
                                  // Smart Apply: replace entire editor content with the AI's complete updated file
                                  const model = editor.getModel();
                                  if (model) {
                                    const fullRange = model.getFullModelRange();
                                    editor.executeEdits("ai-smart-apply", [{
                                      range: fullRange,
                                      text: part.value,
                                    }]);
                                  }
                                }
                              }}
                              className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono cursor-pointer transition-all duration-150 uppercase tracking-wider hover:bg-emerald-500/20"
                            >
                              <Wand2 className="h-3 w-3" />
                              Smart Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editor) {
                                  const selection = editor.getSelection();
                                  const position = editor.getPosition();
                                  if (selection && !selection.isEmpty()) {
                                    editor.executeEdits("ai-chat", [{
                                      range: selection,
                                      text: part.value,
                                    }]);
                                  } else if (position) {
                                    editor.executeEdits("ai-chat", [{
                                      range: {
                                        startLineNumber: position.lineNumber,
                                        startColumn: position.column,
                                        endLineNumber: position.lineNumber,
                                        endColumn: position.column,
                                      },
                                      text: part.value,
                                    }]);
                                  }
                                }
                              }}
                              className="mt-1 ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-mono cursor-pointer transition-all duration-150 uppercase tracking-wider hover:bg-blue-500/20"
                            >
                              <Plus className="h-3 w-3" />
                              Insert at Cursor
                            </button>
                          </div>
                        )
                      )
                    )}
                  </div>
                );
              })
            )}
            {isSending && (
              <div className="max-w-[95%] p-3 rounded-2xl text-xs leading-relaxed border border-border opacity-60">
                Thinking…
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-5 border-t border-border bg-secondary/30">
            <div className="bg-secondary rounded-2xl p-4 border border-border">
              <textarea
                placeholder="Ask iTECity AI..."
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={handleChatKeyDown}
                className="w-full min-h-[80px] resize-none border-none bg-transparent text-foreground text-[11px] font-sans outline-none"
              ></textarea>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-3">
                  <button type="button" className="border-none bg-transparent text-muted-foreground p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-accent hover:text-foreground">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button type="button" className="border-none bg-transparent text-muted-foreground p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-accent hover:text-foreground">
                    <Mic className="h-5 w-5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSendChat}
                  disabled={isSending}
                  className="border-none bg-primary text-primary-foreground rounded-xl p-2 grid place-items-center cursor-pointer transition-all duration-150 hover:shadow-[0_0_15px_rgba(250,250,250,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
