"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type * as monaco from "monaco-editor";

// ──────────────────────────────────────────────────────────────────────
// useRageQuitDetector
// Detects frantic backspacing (15× in 3 s) OR the magic string
// "// I hate this bug" typed in the editor.  When triggered it
// dynamically loads Matter.js, converts marked DOM elements into
// physics bodies, lets them fall with gravity, shows a calming
// message, then gracefully restores the UI.
// ──────────────────────────────────────────────────────────────────────

const BACKSPACE_THRESHOLD = 15;
const BACKSPACE_WINDOW_MS = 3000;
const TRIGGER_PHRASE = "// I hate this bug";
const GRAVITY_DURATION_MS = 5000;
const RESTORE_DELAY_MS = 2500;

interface PhysicsBody {
  el: HTMLElement;
  body: Matter.Body;
  originRect: DOMRect;
}

export function useRageQuitDetector(
  editor: monaco.editor.IStandaloneCodeEditor | null,
) {
  const [isRaging, setIsRaging] = useState(false);
  const backspaceTimestampsRef = useRef<number[]>([]);
  const isRagingRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // ── Trigger the rage quit sequence ───────────────────────────────
  const triggerRageQuit = useCallback(async () => {
    if (isRagingRef.current) return;
    isRagingRef.current = true;
    setIsRaging(true);

    // Dynamically load Matter.js
    const Matter = await import("matter-js");
    const { Engine, Runner, Bodies, Composite, Body } = Matter;

    const engine = Engine.create({ gravity: { x: 0, y: 1.8, scale: 0.001 } });
    const runner = Runner.create();

    // ── Collect all elements marked with data-ragequit ──────────
    const elements: HTMLElement[] = Array.from(
      document.querySelectorAll<HTMLElement>("[data-ragequit]"),
    );

    if (elements.length === 0) {
      isRagingRef.current = false;
      setIsRaging(false);
      return;
    }

    // Build physics bodies from DOM rects
    const physicsBodies: PhysicsBody[] = [];

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const body = Bodies.rectangle(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        rect.width,
        rect.height,
        {
          restitution: 0.45,
          friction: 0.3,
          frictionAir: 0.01,
          angle: 0,
        },
      );

      // Give each body a small random initial velocity for flair
      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 6,
        y: -(Math.random() * 4 + 1),
      });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.15);

      physicsBodies.push({ el, body, originRect: rect });
    }

    // ── Static walls (floor + side walls) ────────────────────────
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const wallThickness = 60;

    const floor = Bodies.rectangle(vw / 2, vh + wallThickness / 2, vw * 2, wallThickness, {
      isStatic: true,
    });
    const leftWall = Bodies.rectangle(-wallThickness / 2, vh / 2, wallThickness, vh * 2, {
      isStatic: true,
    });
    const rightWall = Bodies.rectangle(vw + wallThickness / 2, vh / 2, wallThickness, vh * 2, {
      isStatic: true,
    });

    Composite.add(engine.world, [
      floor,
      leftWall,
      rightWall,
      ...physicsBodies.map((pb) => pb.body),
    ]);

    // ── Pull elements out of document flow ────────────────────────
    const originalStyles: { el: HTMLElement; cssText: string }[] = [];

    for (const pb of physicsBodies) {
      originalStyles.push({ el: pb.el, cssText: pb.el.style.cssText });

      pb.el.style.position = "fixed";
      pb.el.style.left = `${pb.originRect.left}px`;
      pb.el.style.top = `${pb.originRect.top}px`;
      pb.el.style.width = `${pb.originRect.width}px`;
      pb.el.style.height = `${pb.originRect.height}px`;
      pb.el.style.zIndex = "9998";
      pb.el.style.margin = "0";
      pb.el.style.transition = "none";
      pb.el.style.willChange = "transform";
      pb.el.style.pointerEvents = "none";
      pb.el.classList.add("rage-quit-element");
    }

    // ── Animation loop — sync DOM transform to physics sim ───────
    let animId: number;
    const tick = () => {
      for (const pb of physicsBodies) {
        const { x, y } = pb.body.position;
        const angle = pb.body.angle;
        const dx = x - (pb.originRect.left + pb.originRect.width / 2);
        const dy = y - (pb.originRect.top + pb.originRect.height / 2);
        pb.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${angle}rad)`;
      }
      animId = requestAnimationFrame(tick);
    };

    Runner.run(runner, engine);
    animId = requestAnimationFrame(tick);

    // ── After GRAVITY_DURATION_MS → show calming message ─────────
    const messageTimer = window.setTimeout(() => {
      const overlay = document.createElement("div");
      overlay.className = "rage-quit-overlay";
      overlay.innerHTML = `
        <div class="rage-quit-message">
          <span class="rage-quit-emoji">🧘</span>
          <p>Whoa, take a deep breath.<br/>Let me clean this up for you.</p>
        </div>
      `;
      document.body.appendChild(overlay);

      // Force reflow then add visible class for CSS transition
      requestAnimationFrame(() => overlay.classList.add("rage-quit-overlay--visible"));

      // ── After RESTORE_DELAY_MS → restore everything ────────────
      const restoreTimer = window.setTimeout(() => {
        // Stop physics
        cancelAnimationFrame(animId);
        Runner.stop(runner);
        Engine.clear(engine);

        // Restore styles
        for (const { el, cssText } of originalStyles) {
          el.style.cssText = cssText;
          el.classList.remove("rage-quit-element");
        }

        // Fade out overlay
        overlay.classList.remove("rage-quit-overlay--visible");
        overlay.classList.add("rage-quit-overlay--exit");
        setTimeout(() => {
          overlay.remove();
          isRagingRef.current = false;
          setIsRaging(false);
        }, 600);
      }, RESTORE_DELAY_MS);

      // Store the inner timer for cleanup
      cleanupRef.current = () => {
        clearTimeout(restoreTimer);
        cancelAnimationFrame(animId);
        Runner.stop(runner);
        Engine.clear(engine);
        for (const { el, cssText } of originalStyles) {
          el.style.cssText = cssText;
          el.classList.remove("rage-quit-element");
        }
        overlay.remove();
        isRagingRef.current = false;
        setIsRaging(false);
      };
    }, GRAVITY_DURATION_MS);

    // Expose outer cleanup
    cleanupRef.current = () => {
      clearTimeout(messageTimer);
      cancelAnimationFrame(animId);
      Runner.stop(runner);
      Engine.clear(engine);
      for (const { el, cssText } of originalStyles) {
        el.style.cssText = cssText;
        el.classList.remove("rage-quit-element");
      }
      isRagingRef.current = false;
      setIsRaging(false);
    };
  }, []);

  // ── Keyboard listener for rapid backspace detection ─────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRagingRef.current) return;

      if (e.key === "Backspace") {
        const now = Date.now();
        backspaceTimestampsRef.current.push(now);

        // Prune old timestamps
        backspaceTimestampsRef.current = backspaceTimestampsRef.current.filter(
          (t) => now - t <= BACKSPACE_WINDOW_MS,
        );

        if (backspaceTimestampsRef.current.length >= BACKSPACE_THRESHOLD) {
          backspaceTimestampsRef.current = [];
          triggerRageQuit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerRageQuit]);

  // ── Editor content listener for magic phrase detection ──────────
  useEffect(() => {
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const disposable = model.onDidChangeContent(() => {
      if (isRagingRef.current) return;
      const value = model.getValue();
      if (value.includes(TRIGGER_PHRASE)) {
        triggerRageQuit();
      }
    });

    return () => disposable.dispose();
  }, [editor, triggerRageQuit]);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return { isRaging, triggerRageQuit };
}
