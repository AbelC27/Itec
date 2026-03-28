"use client";

import { useRef, useEffect, useCallback, useState, type KeyboardEvent } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useProfile } from "@/hooks/useProfile";
import { useYjsSupabase } from "@/hooks/useYjsSupabase";
import { useExecution } from "@/hooks/useExecution";
import { useHistory } from "@/hooks/useHistory";
import {
  getWsBaseUrl,
  sendAiChat,
  ApiError,
  pullDocumentContent,
  pushDocumentContent,
} from "../lib/api";
import { getWsBaseUrl, sendAiChat, ApiError, getChatSessions, createChatSession, deleteChatSession, getChatMessages, saveChatMessage } from "../lib/api";
import type { AiChatSession } from "../lib/api";
import type * as monaco from "monaco-editor";
import styles from "./collaborative-editor.module.css";

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
}

type WsMessage =
  | { type: "code_update"; code: string }
  | { type: "terminal_stream"; data: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export default function CollaborativeEditor({
  documentId,
  language = "python",
  initialContent = "",
}: CollaborativeEditorProps) {
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <div className={styles.loading}>
        Loading...
      </div>
    );
  }

  return (
    <EditorWithYjs
      documentId={documentId}
      profile={profile}
      language={language}
      initialContent={initialContent}
    />
  );
}

function EditorWithYjs({
  documentId,
  profile,
  language,
  initialContent,
}: {
  documentId: string;
  profile: { id: string; username: string; avatar_color_hex: string };
  language: string;
  initialContent: string;
}) {
  const yjsState = useYjsSupabase(documentId, profile);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const cloudPersistTimeoutRef = useRef<number | null>(null);
  const lastCloudContentRef = useRef(initialContent);
  const isApplyingCloudContentRef = useRef(false);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [code, setCode] = useState("");
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
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
    lastCloudContentRef.current = initialContent;
  }, [initialContent]);

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

    const syncTextToCloud = (nextContent: string) => {
      if (cloudPersistTimeoutRef.current) {
        window.clearTimeout(cloudPersistTimeoutRef.current);
      }

      cloudPersistTimeoutRef.current = window.setTimeout(() => {
        void pushDocumentContent(documentId, nextContent)
          .then(() => {
            lastCloudContentRef.current = nextContent;
          })
          .catch(() => {
            // Keep editing responsive; the extension/app can retry on the next change or poll cycle.
          });
      }, 350);
    };

    const applyCloudContent = (nextContent: string) => {
      if (nextContent === yText.toString()) {
        lastCloudContentRef.current = nextContent;
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
    };

    const ensureInitialContent = () => {
      if (!initialContent || yText.length > 0) {
        if (yText.length > 0) {
          lastCloudContentRef.current = yText.toString();
          setCode(yText.toString());
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

      syncTextToCloud(nextContent);
    };

    const handleProviderSync = (isSynced: boolean) => {
      if (isSynced) {
        ensureInitialContent();
      }
    };

    yText.observe(handleYTextChange);
    provider.on("sync", handleProviderSync);
    ensureInitialContent();

    const pollHandle = window.setInterval(() => {
      void pullDocumentContent(documentId)
        .then((response) => {
          const remoteContent = response.content ?? "";
          if (remoteContent === lastCloudContentRef.current && remoteContent === yText.toString()) {
            return;
          }

          if (remoteContent !== yText.toString()) {
            applyCloudContent(remoteContent);
          } else {
            lastCloudContentRef.current = remoteContent;
          }
        })
        .catch(() => {
          // Ignore transient fetch errors; local editing should continue.
        });
    }, 2500);

    return () => {
      yText.unobserve(handleYTextChange);
      provider.off("sync", handleProviderSync);
      window.clearInterval(pollHandle);
      if (cloudPersistTimeoutRef.current) {
        window.clearTimeout(cloudPersistTimeoutRef.current);
        cloudPersistTimeoutRef.current = null;
      }
    };
  }, [documentId, initialContent, yjsState]);

  useEffect(() => {
    let socket: WebSocket | null = null;

    try {
      const baseUrl = getWsBaseUrl();
      const wsUrl = `${baseUrl}/sessions/${documentId}`;
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;
    } catch {
      return () => undefined;
    }

    socket.onmessage = (event) => {
      let parsed: WsMessage | null = null;
      try {
        parsed = JSON.parse(event.data) as WsMessage;
      } catch {
        parsed = null;
      }

      if (!parsed || typeof parsed !== "object") {
        return;
      }

      if (parsed.type === "code_update" && typeof parsed.code === "string") {
        setCode(parsed.code);
      }

      if (parsed.type === "terminal_stream" && typeof parsed.data === "string") {
        setTerminalLines((prev) => [...prev, parsed.data]);
      }
    };

    socket.onclose = () => {
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };

    return () => {
      if (socket) {
        socket.close();
      }
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };
  }, [documentId]);

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    setEditor(editorInstance);
  }, []);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (newCode === code) {
        return;
      }
      setCode(newCode);
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(JSON.stringify({ type: "code_update", code: newCode }));
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

  return (
    <div className={styles.workspace}>
      <main className={styles.main}>
        <section className={styles.editorPane}>
          <div className={styles.statusBar}>
            <div className={styles.statusLeft}>
              <div className={styles.bannerMetric}>
                {execution.isScanning ? (
                  <>
                    <span
                      className={styles.icon}
                      style={{ fontSize: "14px", animation: "spin 1s linear infinite" }}
                    >
                      hourglass_top
                    </span>
                    <strong>AI Scanning...</strong>
                  </>
                ) : execution.aiResources ? (
                  <>
                    <span>CPU:</span>
                    <strong>{execution.aiResources.cpu}</strong>
                    <span style={{ marginLeft: "4px" }}>RAM:</span>
                    <strong>{execution.aiResources.ram}</strong>
                  </>
                ) : (
                  <span>AI: Idle</span>
                )}
              </div>
              {execution.executionTime !== null && (
                <div className={styles.bannerMetric}>
                  <span>EXEC TIME:</span>
                  <strong className={styles.secondaryText}>
                    {execution.executionTime.toFixed(2)}s
                  </strong>
                </div>
              )}
              <div className={styles.bannerMetric}>
                <span>LATENCY:</span>
                <strong className={styles.secondaryText}>~14ms</strong>
              </div>
            </div>
            <div className={styles.statusRight}>
              <button
                type="button"
                onClick={handleRunCode}
                disabled={execution.isRunning}
                className={styles.deployButton}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: execution.isRunning ? 0.6 : 1,
                  cursor: execution.isRunning ? "not-allowed" : "pointer",
                }}
              >
                <span className={styles.icon} style={{ fontSize: "16px" }}>
                  {execution.isRunning ? "hourglass_top" : "play_arrow"}
                </span>
                {execution.isRunning ? "Running…" : "Run"}
              </button>
              <button type="button" className={styles.navButton}>
                <span className={styles.icon}>close</span>
              </button>
            </div>
          </div>
          <div className={styles.tabBar}>
            <span className={styles.tab}>
              {language.charAt(0).toUpperCase() + language.slice(1)} — {documentId.slice(0, 8)}
            </span>
          </div>
          <div className={styles.editorSurface}>
            <div className={styles.editorWrapper}>
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
          {execution.securityAlert && (
            <div
              style={{
                background: "#ff5555",
                color: "#ffffff",
                padding: "10px 16px",
                fontSize: "12px",
                fontFamily: "'Fira Code', monospace",
                fontWeight: 600,
              }}
            >
              {execution.securityAlert}
            </div>
          )}
          <div className={`${styles.terminal} ${styles.glassPanel}`}>
            <div className={styles.terminalHeader}>
              <span
                className={activeTab === "Terminal" ? "active" : ""}
                onClick={() => setActiveTab("Terminal")}
                style={{ cursor: "pointer" }}
              >
                Terminal
              </span>
              <span
                className={activeTab === "History" ? "active" : ""}
                onClick={() => setActiveTab("History")}
                style={{ cursor: "pointer" }}
              >
                History {historyHook.history.length > 0 ? `(${historyHook.history.length})` : ""}
              </span>
              <span>Debug Console</span>
              {activeTab === "Terminal" && showExecutionOutput && (
                <button
                  type="button"
                  onClick={execution.clear}
                  style={{
                    marginLeft: "8px",
                    fontSize: "10px",
                    color: "#94a3b8",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Clear
                </button>
              )}
              <span style={{ marginLeft: "auto" }} className={styles.icon}>
                remove
              </span>
              <span className={styles.icon}>close</span>
            </div>
            <div className={styles.terminalBody}>
              {showExecutionOutput ? (
                <div style={{ marginTop: 8 }}>
                  {execution.output && (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "#e2e8f0",
                        opacity: 0.85,
                      }}
                    >
                      {execution.output}
                    </pre>
                  )}
                  {execution.error && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "#f87171",
                        fontSize: "12px",
                        fontFamily: "monospace",
                      }}
                    >
                      ⚠ {execution.error}
                    </div>
                  )}
                  {execution.isRunning && (
                    <div
                      style={{
                        marginTop: "8px",
                        color: "#60a5fa",
                        fontSize: "11px",
                        fontFamily: "monospace",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        className={styles.icon}
                        style={{ fontSize: "14px", animation: "spin 1s linear infinite" }}
                      >
                        hourglass_top
                      </span>
                      Executing…
                    </div>
                  )}
                  {!execution.isRunning && execution.executionTime !== null && (
                    <div
                      style={{
                        marginTop: "8px",
                        color: execution.exitCode === 0 ? "#34d399" : "#f87171",
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}
                    >
                      {execution.exitCode === 0 ? "✓ Completed in " : "✗ Failed after "}
                      {execution.executionTime.toFixed(3)}s
                    </div>
                  )}

                  {!execution.isRunning && execution.exitCode !== null && execution.exitCode > 0 && (
                    <div style={{ marginTop: "12px" }}>
                      {!execution.aiExplanation && !execution.isExplaining && (
                        <button
                          type="button"
                          onClick={() => execution.explainWithAI(language, editor?.getValue() ?? code)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            background: "rgba(168,85,247,0.15)",
                            border: "1px solid rgba(168,85,247,0.3)",
                            color: "#d8b4fe",
                            fontSize: "11px",
                            fontFamily: "monospace",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          <span>🤖</span> Explain with AI
                        </button>
                      )}

                      {execution.isExplaining && (
                        <div
                          style={{
                            color: "#d8b4fe",
                            fontSize: "11px",
                            fontFamily: "monospace",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            className={styles.icon}
                            style={{ fontSize: "14px", animation: "spin 1s linear infinite" }}
                          >
                            hourglass_empty
                          </span>
                          Analyzing error…
                        </div>
                      )}

                      {execution.aiExplanation && (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "12px",
                            borderRadius: "6px",
                            background: "rgba(168,85,247,0.05)",
                            border: "1px solid rgba(168,85,247,0.2)",
                            color: "#e9d5ff",
                            fontSize: "12px",
                            lineHeight: "1.5",
                            fontFamily: "system-ui, -apple-system, sans-serif",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          <div style={{
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "#c084fc",
                            marginBottom: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            <span>🤖</span> AI Explanation
                          </div>
                          {execution.aiExplanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : terminalLines.length > 0 ? (
                <div style={{ opacity: 0.7, marginTop: 8 }}>
                  {terminalLines.map((line, index) => (
                    <div key={`${index}-${line}`}>{line}</div>
                  ))}
                </div>
              ) : (
                <div style={{ opacity: 0.7, marginTop: 8 }}>
                  <div>No terminal output yet.</div>
                </div>
              )}
              {activeTab === "Terminal" && (
                <div className={styles.terminalInput}>
                  <span>~/architect/neural_core</span>
                  <span className={styles.icon}>chevron_right</span>
                  <input placeholder="Awaiting architect command..." type="text" />
                </div>
              )}
            </div>

            {activeTab === "History" && (
              <div className={styles.terminalBody} style={{ overflowY: "auto", maxHeight: "100%" }}>
                {historyHook.isLoading ? (
                  <div style={{ opacity: 0.7, marginTop: 8 }}>Loading history...</div>
                ) : historyHook.error ? (
                  <div style={{ color: "#f87171", marginTop: 8 }}>⚠ {historyHook.error}</div>
                ) : historyHook.history.length === 0 ? (
                  <div style={{ opacity: 0.7, marginTop: 8 }}>No execution history yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                    {historyHook.history.map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          padding: "10px",
                          borderRadius: "4px",
                          background: "rgba(15, 23, 42, 0.4)",
                          border: "1px solid rgba(51, 65, 85, 0.5)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <div style={{
                            fontSize: "12px",
                            color: entry.stderr ? "#f87171" : "#34d399",
                            fontFamily: "monospace",
                            marginBottom: "4px"
                          }}>
                            {entry.stderr ? "✗ Failed" : "✓ Success"} • {new Date(entry.created_at).toLocaleString()}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>
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
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            background: "rgba(59, 130, 246, 0.1)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            color: "#93c5fd",
                            fontSize: "10px",
                            textTransform: "uppercase",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
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

        <aside className={styles.aiPanel}>
          {/* Chat session tabs */}
          <div style={{
            padding: "8px 12px",
            borderBottom: "1px solid rgba(42, 61, 79, 0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            maxHeight: "140px",
            overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#94a3b8", fontWeight: 700 }}>
                Chats
              </span>
              <button
                type="button"
                onClick={handleNewChat}
                style={{
                  background: "none",
                  border: "1px solid rgba(0, 209, 255, 0.3)",
                  borderRadius: "4px",
                  color: "#80eaff",
                  fontSize: "10px",
                  padding: "2px 6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span className={styles.icon} style={{ fontSize: "12px" }}>add</span>
                New
              </button>
            </div>
            {isLoadingSessions ? (
              <span style={{ fontSize: "10px", color: "#64748b" }}>Loading…</span>
            ) : chatSessions.length === 0 ? (
              <span style={{ fontSize: "10px", color: "#64748b" }}>No chats yet. Send a message to start.</span>
            ) : (
              chatSessions.map((session) => (
                <div
                  key={session.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "10px",
                    background: activeSessionId === session.id ? "rgba(0, 209, 255, 0.1)" : "transparent",
                    border: activeSessionId === session.id ? "1px solid rgba(0, 209, 255, 0.2)" : "1px solid transparent",
                    color: activeSessionId === session.id ? "#80eaff" : "#94a3b8",
                    transition: "all 0.15s",
                  }}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {session.title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(session.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      padding: "0 2px",
                      fontSize: "12px",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    <span className={styles.icon} style={{ fontSize: "14px" }}>close</span>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className={styles.aiHeader}>
            <div className={styles.avatar}>
              <img
                alt="AI Avatar"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYjJj3xmWNxsfNv-m0aOn2bsxrnEL3iuAD_V4xFEQ8RcaT2AkNLE23zaIJYFBO6rhSR6IQsJOU5psJvf3zpjwr8XSxqeq2YBs-1muiDxq-SXjC_aWLcZezZBabV7yfw4vu6zsT-Ad1u6uaqXDL2ZUw985HG4CSPssY4RYwjNF8oTZIANgsHpzEc6RLT4feLAGTekgH-BKVmH0s7fM2G1dfyeCXCDUDqZSDXVRf7RO0RMTHTvXzKe94Dshsm8pYz5C3qJS_5hHP-yY"
              />
              <div className={styles.avatarStatus} />
            </div>
            <div>
              <div className={styles.aiHeaderTitle}>iTECity AI</div>
              <div className={styles.aiHeaderSubtitle}>STATUS: READY</div>
            </div>
          </div>

          <div className={styles.chatArea}>
            {chatMessages.length === 0 ? (
              <div className={styles.chatBubble}>No messages yet.</div>
            ) : (
              chatMessages.map((message) => {
                const isUser = message.role === "user";
                const parts = isUser ? null : parseMessageParts(message.content);

                return (
                  <div
                    key={message.id}
                    className={
                      isUser
                        ? `${styles.chatBubble} ${styles.chatBubbleUser}`
                        : `${styles.chatBubble} ${styles.chatBubbleBot}`
                    }
                  >
                    {isUser || !parts ? (
                      message.content
                    ) : (
                      parts.map((part, i) =>
                        part.type === "text" ? (
                          <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part.value}</span>
                        ) : (
                          <div key={i} style={{ marginTop: 6, marginBottom: 6 }}>
                            <pre
                              style={{
                                margin: 0,
                                padding: "8px 10px",
                                borderRadius: "6px",
                                background: "rgba(1, 22, 39, 0.8)",
                                border: "1px solid rgba(42, 61, 79, 0.4)",
                                fontSize: "11px",
                                fontFamily: "'Fira Code', monospace",
                                color: "#e2e8f0",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                overflowX: "auto",
                              }}
                            >
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
                              style={{
                                marginTop: "4px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                background: "rgba(80, 250, 123, 0.1)",
                                border: "1px solid rgba(80, 250, 123, 0.3)",
                                color: "#50fa7b",
                                fontSize: "10px",
                                fontFamily: "'Fira Code', monospace",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                              }}
                            >
                              <span className={styles.icon} style={{ fontSize: "12px" }}>
                                auto_fix_high
                              </span>
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
                              style={{
                                marginTop: "4px",
                                marginLeft: "4px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                background: "rgba(0, 209, 255, 0.1)",
                                border: "1px solid rgba(0, 209, 255, 0.3)",
                                color: "#80eaff",
                                fontSize: "10px",
                                fontFamily: "'Fira Code', monospace",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                              }}
                            >
                              <span className={styles.icon} style={{ fontSize: "12px" }}>
                                add
                              </span>
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
              <div className={styles.chatBubble} style={{ opacity: 0.6 }}>
                Thinking…
              </div>
            )}
          </div>

          <div className={styles.chatInput}>
            <div className={styles.chatInputBox}>
              <textarea
                placeholder="Ask iTECity AI..."
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={handleChatKeyDown}
              ></textarea>
              <div className={styles.chatActions}>
                <div className={styles.actionButtons}>
                  <button type="button" className={styles.navButton}>
                    <span className={styles.icon}>attachment</span>
                  </button>
                  <button type="button" className={styles.navButton}>
                    <span className={styles.icon}>mic</span>
                  </button>
                </div>
                <button type="button" className={styles.sendButton} onClick={handleSendChat} disabled={isSending} style={isSending ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
                  <span className={styles.icon}>send</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
