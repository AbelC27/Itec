"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActiveDocument } from "@/components/providers/active-document-provider";
import { useHistory } from "@/hooks/useHistory";
import { sendAiChat } from "@/lib/api";
import type { ExecutionHistoryEntry } from "@/types/execution-history";
import { Loader2, Copy, Check, AlertCircle, Clock, History, Bug, Sparkles } from "lucide-react";

/* ─── Big menacing SVG bug for the squash page ────────────────────── */
function MenacingBug({ isSquashed }: { isSquashed: boolean }) {
  return (
    <div
      className="transition-all duration-500 ease-in-out"
      style={{
        transform: isSquashed ? "scaleY(0.08) scaleX(1.3)" : "scaleY(1) scaleX(1)",
        opacity: isSquashed ? 0.3 : 1,
        filter: isSquashed
          ? "saturate(0) brightness(0.5)"
          : "drop-shadow(0 0 20px rgba(239,68,68,0.4))",
      }}
    >
      <style>{`
        @keyframes menacingBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes menacingLeg {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(8deg); }
          75% { transform: rotate(-8deg); }
        }
        @keyframes eyePulse {
          0%, 100% { r: 3; fill: #fca5a5; }
          50% { r: 3.5; fill: #fef2f2; }
        }
      `}</style>
      <svg
        width="160"
        height="130"
        viewBox="0 0 160 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: isSquashed
            ? "none"
            : "menacingBreathe 2s ease-in-out infinite",
        }}
      >
        {/* Shadow */}
        <ellipse cx="80" cy="126" rx="55" ry="4" fill="#000" opacity="0.3" />

        {/* Body */}
        <ellipse cx="80" cy="75" rx="38" ry="32" fill="#7f1d1d" />
        <ellipse cx="80" cy="75" rx="38" ry="32" fill="url(#menacingShell)" />

        {/* Shell line */}
        <line x1="80" y1="43" x2="80" y2="107" stroke="#450a0a" strokeWidth="2" />

        {/* Shell spots */}
        <circle cx="65" cy="65" r="5" fill="#450a0a" opacity="0.45" />
        <circle cx="95" cy="65" r="4.5" fill="#450a0a" opacity="0.45" />
        <circle cx="68" cy="87" r="4" fill="#450a0a" opacity="0.35" />
        <circle cx="92" cy="87" r="4.5" fill="#450a0a" opacity="0.35" />
        <circle cx="80" cy="95" r="3" fill="#450a0a" opacity="0.3" />

        {/* Head */}
        <circle cx="80" cy="40" r="18" fill="#991b1b" />

        {/* Angry eyebrow ridges */}
        <line x1="66" y1="32" x2="75" y2="35" stroke="#450a0a" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="94" y1="32" x2="85" y2="35" stroke="#450a0a" strokeWidth="2.5" strokeLinecap="round" />

        {/* Eyes */}
        <circle cx="73" cy="38" r="3" fill="#fca5a5" style={{ animation: isSquashed ? "none" : "eyePulse 1.5s ease-in-out infinite" }} />
        <circle cx="87" cy="38" r="3" fill="#fca5a5" style={{ animation: isSquashed ? "none" : "eyePulse 1.5s ease-in-out infinite 0.3s" }} />
        <circle cx="73" cy="38" r="1.5" fill="#1c1917" />
        <circle cx="87" cy="38" r="1.5" fill="#1c1917" />

        {/* Mandibles */}
        <path d="M 74 50 Q 77 55 80 50 Q 83 55 86 50" stroke="#b91c1c" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Antennae */}
        <path d="M 70 25 Q 60 8 50 5" stroke="#b91c1c" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="50" cy="5" r="3.5" fill="#ef4444" />
        <path d="M 90 25 Q 100 8 110 5" stroke="#b91c1c" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="110" cy="5" r="3.5" fill="#ef4444" />

        {/* Legs — Left */}
        <g style={{ animation: isSquashed ? "none" : "menacingLeg 0.4s ease-in-out infinite", transformOrigin: "42px 60px" }}>
          <line x1="42" y1="60" x2="15" y2="45" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g style={{ animation: isSquashed ? "none" : "menacingLeg 0.4s ease-in-out infinite 0.13s", transformOrigin: "42px 75px" }}>
          <line x1="42" y1="75" x2="12" y2="75" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g style={{ animation: isSquashed ? "none" : "menacingLeg 0.4s ease-in-out infinite 0.26s", transformOrigin: "42px 90px" }}>
          <line x1="42" y1="90" x2="15" y2="105" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Legs — Right */}
        <g style={{ animation: isSquashed ? "none" : "menacingLeg 0.4s ease-in-out infinite 0.2s", transformOrigin: "118px 60px" }}>
          <line x1="118" y1="60" x2="145" y2="45" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g style={{ animation: isSquashed ? "none" : "menacingLeg 0.4s ease-in-out infinite 0.06s", transformOrigin: "118px 75px" }}>
          <line x1="118" y1="75" x2="148" y2="75" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g style={{ animation: isSquashed ? "none" : "menacingLeg 0.4s ease-in-out infinite 0.16s", transformOrigin: "118px 90px" }}>
          <line x1="118" y1="90" x2="145" y2="105" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        <defs>
          <radialGradient id="menacingShell" cx="0.4" cy="0.35" r="0.65">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ─── Bug squash page content (when query params exist) ───────────── */
function BugSquashPanel({
  line,
  codeSnippet,
  documentId,
}: {
  line: number;
  codeSnippet: string;
  documentId: string;
}) {
  const router = useRouter();
  const [isSquashed, setIsSquashed] = useState(false);
  const [showFixedCode, setShowFixedCode] = useState(false);
  const [fixedCode, setFixedCode] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);

  const handleSquash = useCallback(async () => {
    setIsSquashed(true);
    setIsFixing(true);

    // Fire confetti!
    try {
      const confetti = (await import("canvas-confetti")).default;
      // First burst — green "squash" confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.45 },
        colors: ["#34d399", "#10b981", "#6ee7b7", "#fbbf24", "#f87171"],
      });
      // Delayed second burst
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 120,
          origin: { y: 0.5 },
          colors: ["#a78bfa", "#818cf8", "#34d399"],
        });
      }, 300);
    } catch {
      // Non-critical
    }

    try {
      const promptTitle = `Fix the bug around line ${line} in the provided code.
Your ONLY output must be the FULL, corrected code. You must return the entire code snippet from start to finish with the bug fixed.
CRITICAL INSTRUCTIONS:
- DO NOT use placeholders, abbreviations, or comments like "// ...rest of the code". You must output every line.
- DO NOT include explanations, greetings, or conversational text anywhere.
- Output ONLY the raw code text so it can be directly compiled.`;
      
      const aiResponse = await sendAiChat({
        message: promptTitle,
        code: codeSnippet,
        user_role: "teacher",
      });
      
      let extractedCode = (aiResponse.reply || "").trim();
      
      // If the AI still wrapped the response in a markdown code block, strip it out safely
      if (extractedCode.startsWith("\`\`\`")) {
        const firstNewline = extractedCode.indexOf("\n");
        const lastBackticks = extractedCode.lastIndexOf("\`\`\`");
        if (firstNewline !== -1 && lastBackticks > firstNewline) {
          extractedCode = extractedCode.substring(firstNewline + 1, lastBackticks).trim();
        }
      }

      setFixedCode(extractedCode);
    } catch (e) {
      setFixedCode(codeSnippet + "\n// AI Fix failed to load. Please try again or use the Editor Chat.");
    } finally {
      setIsFixing(false);
      setShowFixedCode(true);
    }
  }, [line, codeSnippet]);

  const handleApplyFix = () => {
    if (fixedCode) {
      localStorage.setItem(`pending_fix_${documentId}`, fixedCode);
      router.push("/workspace");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      {/* Bug header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
          <Bug className="h-4 w-4" />
          Bug Detected on Line {line}
        </div>
        <p className="text-muted-foreground text-sm max-w-md">
          A wild bug appeared in your code! Click the button below to squash it and let the AI Swarm fix it.
        </p>
      </div>

      {/* Menacing bug */}
      <MenacingBug isSquashed={isSquashed} />

      {/* Squash button */}
      {!isSquashed && (
        <button
          type="button"
          onClick={handleSquash}
          className="group relative px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest cursor-pointer transition-all duration-300 border-none text-white overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #dc2626 0%, #991b1b 50%, #7f1d1d 100%)",
            boxShadow: "0 0 30px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          <span className="relative z-10 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Fix & Squash!
          </span>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)",
            }}
          />
        </button>
      )}

      {/* Squashed message */}
      {(isSquashed && isFixing) && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-mono animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI Swarm is analyzing and fixing your code…
        </div>
      )}

      {/* Fixed code display */}
      {(showFixedCode && fixedCode) && (
        <div className="w-full max-w-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            <Check className="h-4 w-4" />
            Bug Squashed! Here&apos;s your fixed code:
          </div>
          <pre className="font-mono text-[13px] text-foreground whitespace-pre-wrap bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-5 leading-relaxed max-h-[400px] overflow-y-auto">
            {fixedCode}
          </pre>
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              onClick={handleApplyFix}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              Apply Fix & Return to Editor
            </button>
            <p className="text-muted-foreground text-[11px] text-center">
              The Swarm will auto-apply this patch to your workspace.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────── */
export default function DebuggingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        </div>
      }
    >
      <DebuggingPageInner />
    </Suspense>
  );
}

function DebuggingPageInner() {
  const { activeDocumentId } = useActiveDocument();
  const searchParams = useSearchParams();
  const [selectedEntry, setSelectedEntry] = useState<ExecutionHistoryEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // ── Bug squash mode from Walking Bug click ────────────────────────
  const bugLine = searchParams.get("line");
  const bugCode = searchParams.get("code");

  const hasBugParams = bugLine !== null && bugCode !== null;

  // If no active document, show empty state
  if (!activeDocumentId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center space-y-3">
          <History className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">
            Please select a workspace from the Homepage to view its history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Bug Squash panel */}
      {hasBugParams && (
        <div className="shrink-0 border-b border-border bg-card/50 backdrop-blur-sm rounded-2xl mb-4 overflow-hidden">
          <BugSquashPanel
            line={parseInt(bugLine, 10) || 1}
            codeSnippet={decodeURIComponent(bugCode)}
            documentId={activeDocumentId}
          />
        </div>
      )}

      {/* Standard debugging content */}
      <div className="flex-1 min-h-0">
        <DebuggingContent
          documentId={activeDocumentId}
          selectedEntry={selectedEntry}
          setSelectedEntry={setSelectedEntry}
          copied={copied}
          setCopied={setCopied}
          copyError={copyError}
          setCopyError={setCopyError}
        />
      </div>
    </div>
  );
}

function DebuggingContent({
  documentId,
  selectedEntry,
  setSelectedEntry,
  copied,
  setCopied,
  copyError,
  setCopyError,
}: {
  documentId: string;
  selectedEntry: ExecutionHistoryEntry | null;
  setSelectedEntry: (entry: ExecutionHistoryEntry | null) => void;
  copied: boolean;
  setCopied: (v: boolean) => void;
  copyError: boolean;
  setCopyError: (v: boolean) => void;
}) {
  const { history, isLoading, error } = useHistory(documentId);

  // 4.4: Clear selectedEntry when it's no longer in the history list
  useEffect(() => {
    if (selectedEntry && history.length > 0) {
      const stillExists = history.some((entry) => entry.id === selectedEntry.id);
      if (!stillExists) {
        setSelectedEntry(null);
      }
    }
  }, [history, selectedEntry, setSelectedEntry]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
      setCopied(false);
      setTimeout(() => setCopyError(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive-foreground text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left pane — History List */}
      <div className="w-80 shrink-0 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Execution History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No execution history yet.</p>
        ) : (
          <div className="space-y-1">
            {history.map((entry) => {
              const isSelected = selectedEntry?.id === entry.id;
              const hasFailed = !!entry.stderr && entry.stderr.trim().length > 0;
              const timestamp = new Date(entry.created_at).toLocaleString();

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                  className={`w-full text-left px-3 py-3 rounded-lg cursor-pointer transition-all duration-150 hover:bg-accent ${
                    isSelected
                      ? "bg-accent border border-border"
                      : "border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{timestamp}</span>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        hasFailed
                          ? "text-red-400 bg-red-950/40"
                          : "text-emerald-400 bg-emerald-950/40"
                      }`}
                    >
                      {hasFailed ? "Failed" : "Success"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {entry.execution_time.toFixed(2)}s
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right pane — Snapshot View */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-5">
        {!selectedEntry ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Select an entry to view details</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Code Snapshot */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Code Snapshot
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopyCode(selectedEntry.code_snapshot)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded border border-border hover:border-muted-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      Copied!
                    </>
                  ) : copyError ? (
                    <>
                      <AlertCircle className="h-3 w-3 text-red-400" />
                      Copy failed
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
              <pre className="font-mono text-[13px] text-foreground whitespace-pre-wrap bg-secondary/50 rounded-lg p-4">
                {selectedEntry.code_snapshot}
              </pre>
            </div>

            {/* Stdout */}
            {selectedEntry.stdout && selectedEntry.stdout.trim().length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Output
                </h3>
                <pre className="font-mono text-[13px] text-muted-foreground whitespace-pre-wrap bg-secondary/50 rounded-lg p-3">
                  {selectedEntry.stdout}
                </pre>
              </div>
            )}

            {/* Stderr */}
            {selectedEntry.stderr && selectedEntry.stderr.trim().length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Errors
                </h3>
                <pre className="font-mono text-[13px] text-red-400 bg-destructive/10 border border-destructive/30 rounded-lg p-3 whitespace-pre-wrap">
                  {selectedEntry.stderr}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
