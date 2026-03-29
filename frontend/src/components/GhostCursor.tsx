"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { GhostState } from "@/hooks/useGhostCollab";

// ──────────────────────────────────────────────────────────────────────
// GhostCursor
// A neon-green fake multiplayer cursor that floats around the screen
// with smooth spring animations.  Rendered as a portal to document.body
// so it lives above everything.
// ──────────────────────────────────────────────────────────────────────

interface GhostCursorProps {
  ghostState: GhostState;
}

export default function GhostCursor({ ghostState }: GhostCursorProps) {
  const { isGhostActive, ghostPosition, ghostLabel, isTyping } = ghostState;
  const [mounted, setMounted] = useState(false);

  // Portal needs document.body — only available after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isGhostActive && (
        <motion.div
          className="ghost-cursor"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: ghostPosition.x,
            y: ghostPosition.y,
          }}
          exit={{ opacity: 0, scale: 0.3, transition: { duration: 0.3 } }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 18,
            mass: 0.8,
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 99999,
            pointerEvents: "none",
          }}
        >
          {/* Cursor SVG — arrow pointer */}
          <svg
            width="20"
            height="24"
            viewBox="0 0 20 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="ghost-cursor-svg"
          >
            <path
              d="M2.5 1L17.5 12L10 13.5L7.5 22L2.5 1Z"
              fill="#39FF14"
              stroke="#0a0a0a"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>

          {/* Label badge */}
          <div className="ghost-cursor-label">
            <span className="ghost-cursor-label-dot" />
            {ghostLabel}
            {isTyping && (
              <span className="ghost-typing-indicator">
                <span className="ghost-typing-dot" />
                <span className="ghost-typing-dot" />
                <span className="ghost-typing-dot" />
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
