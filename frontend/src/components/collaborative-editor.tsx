"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useProfile } from "@/hooks/useProfile";
import { useYjsSupabase } from "@/hooks/useYjsSupabase";
import type * as monaco from "monaco-editor";
import styles from "./collaborative-editor.module.css";

interface CollaborativeEditorProps {
  documentId: string;
}

export default function CollaborativeEditor({
  documentId,
}: CollaborativeEditorProps) {
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <div className={styles.loading}>
        Loading...
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

  const connectionText = !yjsState
    ? "Initializing..."
    : yjsState.isConnected
      ? `Connected — Room: itecify-${documentId}`
      : "Disconnected — waiting for server on ws://localhost:4444";

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
          <div className={styles.bannerMetric}>
            <span>LATENCY:</span>
            <strong className={styles.secondaryText}>~14ms</strong>
          </div>
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
          <div className={styles.topBarBrand}>ARCHITECT_IDE</div>
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
            <div className={`${styles.tab} ${styles.tabActive}`}>
              <span className={styles.icon}>javascript</span>
              <span>neural_net.js</span>
              <span className={styles.icon}>close</span>
            </div>
            <div className={styles.tab}>
              <span className={styles.icon}>css</span>
              <span>styles.aether</span>
              <span className={styles.icon}>close</span>
            </div>
          </div>
          <div className={styles.editorSurface}>
            <div className={styles.editorWrapper}>
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
          <div className={`${styles.terminal} ${styles.glassPanel}`}>
            <div className={styles.terminalHeader}>
              <span className="active">Terminal</span>
              <span>Debug Console</span>
              <span>Output</span>
              <span style={{ marginLeft: "auto" }} className={styles.icon}>
                remove
              </span>
              <span className={styles.icon}>close</span>
            </div>
            <div className={styles.terminalBody}>
              <div className={styles.terminalLine}>
                <span>~/architect/neural_core</span>
                <span className={styles.icon}>chevron_right</span>
                <span>npm run build:aether</span>
              </div>
              <div style={{ opacity: 0.7, marginTop: 8 }}>
                <div>&gt; aether-noir@2.0.0-beta.4 build</div>
                <div>&gt; noir-compiler ./src --optimization maximum --shading glass</div>
                <div style={{ marginTop: 8 }}>
                  Initializing Noir Kernel... <span style={{ color: "#50fa7b" }}>SUCCESS</span>
                </div>
                <div>
                  Tracing Aetheric Paths: <span style={{ color: "#70e2ff" }}>8.2k nodes found</span>
                </div>
                <div>
                  Generating Glass Shaders: <span style={{ color: "#bd93f9" }}>DONE [24ms]</span>
                </div>
                <div style={{ marginTop: 12, color: "#8be9fd" }}>
                  Build completed in 32ms. High-fidelity rendering enabled.
                </div>
              </div>
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
              <div className={styles.aiHeaderTitle}>ASSISTANT_V4</div>
              <div className={styles.aiHeaderSubtitle}>STATUS: ANALYZING_NOIR_LOGIC</div>
            </div>
          </div>

          <div className={styles.chatArea}>
            <div className={`${styles.chatBubble} ${styles.chatBubbleUser}`}>
              How can I optimize the telemetry data pipeline for multiple concurrent streams?
            </div>
            <div className={`${styles.chatBubble} ${styles.chatBubbleBot}`}>
              I've drafted a more efficient stream handler with Aetheric Noir optimizations. Drag this block into your editor.
            </div>
          </div>

          <div className={styles.chatInput}>
            <div className={styles.chatInputBox}>
              <textarea placeholder="Ask the Aetheric Architect..."></textarea>
              <div className={styles.chatActions}>
                <div className={styles.actionButtons}>
                  <button type="button" className={styles.navButton}>
                    <span className={styles.icon}>attachment</span>
                  </button>
                  <button type="button" className={styles.navButton}>
                    <span className={styles.icon}>mic</span>
                  </button>
                </div>
                <button type="button" className={styles.sendButton}>
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
