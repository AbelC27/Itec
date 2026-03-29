"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type * as monaco from "monaco-editor";

// ──────────────────────────────────────────────────────────────────────
// useGhostCollab
// Spawns a playful "Ghost AI" cursor when the user idles for 60 s or
// types "// is anyone there?" in the editor.  The ghost moves around,
// evades the user's mouse, and types a spooky message into the editor.
// Dismissed by Escape or any new user typing.
// ──────────────────────────────────────────────────────────────────────

const IDLE_TIMEOUT_MS = 60_000; // 60 seconds
const TRIGGER_PHRASE = "// is anyone there?";
const GHOST_MESSAGE = "/* I am always watching... */";
const FLEE_RADIUS_PX = 50;
const TYPING_SPEED_MS = 80;

export interface GhostState {
  isGhostActive: boolean;
  ghostPosition: { x: number; y: number };
  ghostLabel: string;
  isTyping: boolean;
}

export function useGhostCollab(
  editor: monaco.editor.IStandaloneCodeEditor | null,
): GhostState & { dismissGhost: () => void } {
  const [isGhostActive, setIsGhostActive] = useState(false);
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0 });
  const [isTyping, setIsTyping] = useState(false);

  const ghostActiveRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIndexRef = useRef(0);
  const hasTypedRef = useRef(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const wanderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ghostPosRef = useRef({ x: 0, y: 0 });

  // ── Random position within viewport ────────────────────────────
  const randomPosition = useCallback(() => {
    const padding = 80;
    return {
      x: padding + Math.random() * (window.innerWidth - padding * 2),
      y: padding + Math.random() * (window.innerHeight - padding * 2),
    };
  }, []);

  // ── Flee from user's mouse ─────────────────────────────────────
  const fleeFrom = useCallback(
    (mx: number, my: number) => {
      const gp = ghostPosRef.current;
      const dx = gp.x - mx;
      const dy = gp.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < FLEE_RADIUS_PX && dist > 0) {
        // Dart away in the opposite direction
        const scale = 200 / dist;
        const newX = Math.max(40, Math.min(window.innerWidth - 40, gp.x + dx * scale));
        const newY = Math.max(40, Math.min(window.innerHeight - 40, gp.y + dy * scale));
        const newPos = { x: newX, y: newY };
        ghostPosRef.current = newPos;
        setGhostPosition(newPos);
      }
    },
    [],
  );

  // ── Type the ghost message char by char ────────────────────────
  const startTyping = useCallback(() => {
    if (!editor || hasTypedRef.current) return;
    hasTypedRef.current = true;
    setIsTyping(true);
    typingIndexRef.current = 0;

    const typeNextChar = () => {
      if (!ghostActiveRef.current) {
        setIsTyping(false);
        return;
      }
      if (typingIndexRef.current >= GHOST_MESSAGE.length) {
        setIsTyping(false);
        return;
      }

      const model = editor.getModel();
      if (!model) return;

      const lastLine = model.getLineCount();
      const lastColumn = model.getLineMaxColumn(lastLine);

      // On first character, insert a newline prefix
      const char = GHOST_MESSAGE[typingIndexRef.current];
      const prefix = typingIndexRef.current === 0 ? "\n" : "";

      editor.executeEdits("ghost-ai", [
        {
          range: {
            startLineNumber: lastLine,
            startColumn: lastColumn,
            endLineNumber: lastLine,
            endColumn: lastColumn,
          },
          text: prefix + char,
        },
      ]);

      typingIndexRef.current++;
      typingTimerRef.current = setTimeout(typeNextChar, TYPING_SPEED_MS);
    };

    // Wait 1.5s after spawning before typing
    typingTimerRef.current = setTimeout(typeNextChar, 1500);
  }, [editor]);

  // ── Dismiss the ghost ──────────────────────────────────────────
  const dismissGhost = useCallback(() => {
    ghostActiveRef.current = false;
    setIsGhostActive(false);
    setIsTyping(false);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (wanderIntervalRef.current) {
      clearInterval(wanderIntervalRef.current);
      wanderIntervalRef.current = null;
    }
  }, []);

  // ── Spawn the ghost ────────────────────────────────────────────
  const spawnGhost = useCallback(() => {
    if (ghostActiveRef.current) return;
    ghostActiveRef.current = true;
    hasTypedRef.current = false;
    typingIndexRef.current = 0;

    const startPos = randomPosition();
    ghostPosRef.current = startPos;
    setGhostPosition(startPos);
    setIsGhostActive(true);

    // Wander around every 3-5 seconds
    wanderIntervalRef.current = setInterval(() => {
      if (!ghostActiveRef.current) return;
      const newPos = randomPosition();
      ghostPosRef.current = newPos;
      setGhostPosition(newPos);
    }, 3500);

    // Start typing after a short delay
    setTimeout(() => {
      if (ghostActiveRef.current) startTyping();
    }, 2000);
  }, [randomPosition, startTyping]);

  // ── Reset idle timer ───────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // If ghost is active and user starts interacting, dismiss it
    if (ghostActiveRef.current) {
      dismissGhost();
      return;
    }

    idleTimerRef.current = setTimeout(() => {
      spawnGhost();
    }, IDLE_TIMEOUT_MS);
  }, [spawnGhost, dismissGhost]);

  // ── Global idle tracking (mouse, keyboard, click) ──────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      // If ghost is active, check proximity for flee behavior
      if (ghostActiveRef.current) {
        fleeFrom(e.clientX, e.clientY);
      }
    };

    // Only reset idle on actual user-initiated typing (not on mousemove,
    // which would cause the ghost to never spawn while user is reading).
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape dismisses without resetting idle
      if (e.key === "Escape" && ghostActiveRef.current) {
        dismissGhost();
        return;
      }

      // Any other key → reset idle (and dismiss ghost if active)
      resetIdleTimer();
    };

    const handleClick = () => {
      // Clicks reset idle but don't dismiss the ghost
      // (the ghost is playful — you have to type or press Escape)
      if (!ghostActiveRef.current) {
        resetIdleTimer();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClick);

    // Start the first idle timer
    idleTimerRef.current = setTimeout(() => {
      spawnGhost();
    }, IDLE_TIMEOUT_MS);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClick);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (wanderIntervalRef.current) clearInterval(wanderIntervalRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [resetIdleTimer, fleeFrom, spawnGhost, dismissGhost]);

  // ── Editor content listener for magic phrase ───────────────────
  useEffect(() => {
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const disposable = model.onDidChangeContent(() => {
      if (ghostActiveRef.current) return;
      const value = model.getValue();
      if (value.includes(TRIGGER_PHRASE)) {
        // Clear the idle timer (no double trigger)
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        spawnGhost();
      }
    });

    return () => disposable.dispose();
  }, [editor, spawnGhost]);

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      dismissGhost();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [dismissGhost]);

  return {
    isGhostActive,
    ghostPosition,
    ghostLabel: "Ghost AI",
    isTyping,
    dismissGhost,
  };
}
