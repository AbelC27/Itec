"use client";

import { useRef, useEffect, useCallback, useState, type KeyboardEvent } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useProfile } from "@/hooks/useProfile";
import { useYjsSupabase } from "@/hooks/useYjsSupabase";
import { useExecution } from "@/hooks/useExecution";
import { getWsBaseUrl } from "../lib/api";
import type * as monaco from "monaco-editor";
import styles from "./collaborative-editor.module.css";

interface CollaborativeEditorProps {
  documentId: string;
  language?: string;
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
}: CollaborativeEditorProps) {
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <div className={styles.loading}>
        Loading...
      </div>
    );
  }

  return <EditorWithYjs documentId={documentId} profile={profile} language={language} />;
}

function EditorWithYjs({
  documentId,
  profile,
  language,
}: {
  documentId: string;
  profile: { id: string; username: string; avatar_color_hex: string };
  language: string;
}) {
  const yjsState = useYjsSupabase(documentId, profile);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [code, setCode] = useState("");
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Execution hook
  const execution = useExecution(documentId);

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
    execution.execute(language, currentCode);
  }, [editor, code, language, execution]);

  const handleSendChat = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const now = Date.now();
    const userMessage: ChatMessage = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${now}-user`,
      role: "user",
      content: trimmed,
      createdAt: now,
    };

    const assistantMessage: ChatMessage = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${now}-assistant`,
      role: "assistant",
      content: "AI chat is not connected yet. Hook this up to your backend to respond.",
      createdAt: now + 1,
    };

    setChatMessages((prev) => [...prev, userMessage, assistantMessage]);
    setChatInput("");
  }, [chatInput]);

  const handleChatKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSendChat();
      }
    },
    [handleSendChat]
  );

  const connectionText = !yjsState
    ? "Initializing..."
    : yjsState.isConnected
      ? `Connected — Room: itecity-${documentId}`
      : "Disconnected — waiting for server on ws://localhost:4444";

  // Determine terminal content: execution output takes priority when running/has output
  const hasExecutionOutput = execution.output || execution.error;
  const showExecutionOutput = execution.isRunning || hasExecutionOutput;

  return (
    <div className={styles.workspace}>
      <div className={`${styles.topBanner} ${styles.glassPanel}`}>
        <div className={styles.bannerLeft}>
          <span className={`${styles.icon} ${styles.iconFilled}`}>analytics</span>
          <span className={styles.bannerLabel}>Pre-Execution Scanner:</span>
          <span className={styles.bannerStatus}>OPTIMIZED PATH FOUND</span>
        </div>
        <div className={styles.bannerRight}>
          <div className={styles.bannerMetric}>
            <span>EST. COST:</span>
            <strong>0.00042 ARCH</strong>
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

      <nav className={styles.sideNav}>
        <div className={styles.brandBadge}>
          <div className={styles.brandIcon}>
            <span className={`${styles.icon} ${styles.iconFilled}`}>
              architecture
            </span>
          </div>
          <span className={styles.brandText}>AETHER</span>
        </div>
        <div className={styles.navGroup}>
          <button type="button" className={styles.navButton}>
            <span className={styles.icon}>dashboard</span>
          </button>
          <button type="button" className={`${styles.navButton} ${styles.navButtonActive}`}>
            <span className={`${styles.icon} ${styles.iconFilled}`}>code_blocks</span>
          </button>
          <button type="button" className={styles.navButton}>
            <span className={styles.icon}>bug_report</span>
          </button>
          <button type="button" className={styles.navButton}>
            <span className={styles.icon}>settings</span>
          </button>
        </div>
        <div className={styles.navGroup}>
          <button type="button" className={styles.navButton}>
            <span className={styles.icon}>terminal</span>
          </button>
          <button type="button" className={styles.navButton}>
            <span className={styles.icon}>help_outline</span>
          </button>
        </div>
      </nav>

      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.topBarBrand}>iTECity</div>
          <nav className={styles.topBarLinks}>
            <a className="active" href="#">
              Files
            </a>
            <a href="#">Edit</a>
            <a href="#">Selection</a>
            <a href="#">View</a>
          </nav>
        </div>
        <div className={styles.bannerRight}>
          <div className={styles.searchBox}>
            <span className={`${styles.icon} ${styles.searchIcon}`}>search</span>
            <input placeholder="CMD + P TO SEARCH..." type="text" />
          </div>
          <button type="button" className={styles.navButton}>
            <span className={styles.icon}>smart_toy</span>
          </button>
          <button type="button" className={styles.navButton}>
            <span className={styles.icon}>notifications</span>
          </button>
          <button type="button" className={styles.deployButton}>
            Deploy
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.editorPane}>
          <div
            className={`${styles.connectionBar} ${yjsState?.isConnected ? styles.connected : styles.disconnected
              }`}
          >
            {connectionText}
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
                }}
              />
            </div>
          </div>
          <div className={`${styles.terminal} ${styles.glassPanel}`}>
            <div className={styles.terminalHeader}>
              <span className="active">Terminal</span>
              <span>Debug Console</span>
              <span>Output</span>
              {showExecutionOutput && (
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
                        color: "#34d399",
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}
                    >
                      ✓ Completed in {execution.executionTime.toFixed(3)}s
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
              <div className={styles.terminalInput}>
                <span>~/architect/neural_core</span>
                <span className={styles.icon}>chevron_right</span>
                <input placeholder="Awaiting architect command..." type="text" />
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.aiPanel}>
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
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? `${styles.chatBubble} ${styles.chatBubbleUser}`
                      : `${styles.chatBubble} ${styles.chatBubbleBot}`
                  }
                >
                  {message.content}
                </div>
              ))
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
                <button type="button" className={styles.sendButton} onClick={handleSendChat}>
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
