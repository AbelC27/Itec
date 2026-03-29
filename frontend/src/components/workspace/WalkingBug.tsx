"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WalkingBugProps {
  lineNumber: number;
  errorMessage: string;
  codeSnippet: string;
  topOffset: number;
}

export default function WalkingBug({
  lineNumber,
  errorMessage,
  codeSnippet,
  topOffset,
}: WalkingBugProps) {
  const router = useRouter();
  const [isPaused, setIsPaused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const bugRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Dismiss tooltip if clicked elsewhere
  useEffect(() => {
    if (!showTooltip) return;
    const handler = (e: MouseEvent) => {
      if (
        bugRef.current &&
        !bugRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTooltip]);

  const handleClick = () => {
    const encoded = encodeURIComponent(codeSnippet);
    router.push(`/debugging?line=${lineNumber}&code=${encoded}`);
  };

  return (
    <>
      {/* Inline keyframes — scoped via unique animation name */}
      <style>{`
        @keyframes walkBugHorizontal {
          0%   { transform: translateX(0px)   scaleX(1);  }
          45%  { transform: translateX(220px) scaleX(1);  }
          50%  { transform: translateX(220px) scaleX(-1); }
          95%  { transform: translateX(0px)   scaleX(-1); }
          100% { transform: translateX(0px)   scaleX(1);  }
        }
        @keyframes bugLegWiggle {
          0%, 100% { transform: rotate(0deg); }
          25%      { transform: rotate(12deg); }
          75%      { transform: rotate(-12deg); }
        }
        @keyframes bugBobble {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1.5px); }
        }
        @keyframes bugGlow {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(239,68,68,0.3)); }
          50%      { filter: drop-shadow(0 0 8px rgba(239,68,68,0.6)); }
        }
      `}</style>

      <div
        ref={bugRef}
        className="absolute left-[60px] pointer-events-auto"
        style={{
          top: `${topOffset}px`,
          zIndex: 15,
          animation: isPaused
            ? "none"
            : "walkBugHorizontal 6s ease-in-out infinite",
          cursor: "pointer",
        }}
        onMouseEnter={() => {
          setIsPaused(true);
          setShowTooltip(true);
        }}
        onMouseLeave={() => {
          setIsPaused(false);
          setShowTooltip(false);
        }}
        onClick={handleClick}
        title="Click to squash this bug!"
      >
        {/* Tooltip */}
        {showTooltip && (
          <div
            ref={tooltipRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[280px] px-3 py-2.5 rounded-lg text-[11px] font-mono pointer-events-auto"
            style={{
              background: "linear-gradient(135deg, #1e1b2e 0%, #2d1a1a 100%)",
              border: "1px solid rgba(239,68,68,0.4)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 12px rgba(239,68,68,0.15)",
              color: "#f87171",
              zIndex: 20,
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] uppercase tracking-widest text-red-500/80 font-bold">
                🐛 Bug on Line {lineNumber}
              </span>
            </div>
            <div className="text-red-300/90 text-[10px] leading-relaxed whitespace-pre-wrap break-words">
              {errorMessage.length > 120
                ? errorMessage.slice(0, 120) + "…"
                : errorMessage}
            </div>
            <div className="mt-1.5 text-[9px] text-red-400/50 uppercase tracking-wider">
              Click to squash →
            </div>
          </div>
        )}

        {/* SVG Bug */}
        <svg
          width="28"
          height="22"
          viewBox="0 0 28 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            animation: isPaused
              ? "bugGlow 1.5s ease-in-out infinite"
              : "bugBobble 0.35s ease-in-out infinite, bugGlow 2s ease-in-out infinite",
          }}
        >
          {/* Body (ellipse) */}
          <ellipse cx="14" cy="12" rx="7" ry="6" fill="#7f1d1d" />
          <ellipse cx="14" cy="12" rx="7" ry="6" fill="url(#bugShell)" />

          {/* Shell line */}
          <line x1="14" y1="6" x2="14" y2="18" stroke="#450a0a" strokeWidth="0.7" />

          {/* Shell spots */}
          <circle cx="11" cy="10" r="1.2" fill="#450a0a" opacity="0.5" />
          <circle cx="17" cy="10" r="1" fill="#450a0a" opacity="0.5" />
          <circle cx="11.5" cy="14" r="0.9" fill="#450a0a" opacity="0.4" />
          <circle cx="16.5" cy="14" r="1.1" fill="#450a0a" opacity="0.4" />

          {/* Head */}
          <circle cx="14" cy="6" r="3.5" fill="#991b1b" />

          {/* Eyes */}
          <circle cx="12.5" cy="5.2" r="1" fill="#fca5a5" />
          <circle cx="15.5" cy="5.2" r="1" fill="#fca5a5" />
          <circle cx="12.5" cy="5.2" r="0.45" fill="#1c1917" />
          <circle cx="15.5" cy="5.2" r="0.45" fill="#1c1917" />

          {/* Antennae */}
          <line x1="12" y1="3.5" x2="9" y2="0.5" stroke="#b91c1c" strokeWidth="0.7" strokeLinecap="round" />
          <circle cx="9" cy="0.5" r="0.8" fill="#ef4444" />
          <line x1="16" y1="3.5" x2="19" y2="0.5" stroke="#b91c1c" strokeWidth="0.7" strokeLinecap="round" />
          <circle cx="19" cy="0.5" r="0.8" fill="#ef4444" />

          {/* Legs — Left side */}
          <g style={{ animation: isPaused ? "none" : "bugLegWiggle 0.2s ease-in-out infinite", transformOrigin: "7px 9px" }}>
            <line x1="7" y1="9" x2="2" y2="7" stroke="#b91c1c" strokeWidth="0.9" strokeLinecap="round" />
          </g>
          <g style={{ animation: isPaused ? "none" : "bugLegWiggle 0.2s ease-in-out infinite 0.06s", transformOrigin: "7px 12px" }}>
            <line x1="7" y1="12" x2="2" y2="12" stroke="#b91c1c" strokeWidth="0.9" strokeLinecap="round" />
          </g>
          <g style={{ animation: isPaused ? "none" : "bugLegWiggle 0.2s ease-in-out infinite 0.12s", transformOrigin: "7px 15px" }}>
            <line x1="7" y1="15" x2="2" y2="17" stroke="#b91c1c" strokeWidth="0.9" strokeLinecap="round" />
          </g>

          {/* Legs — Right side */}
          <g style={{ animation: isPaused ? "none" : "bugLegWiggle 0.2s ease-in-out infinite 0.1s", transformOrigin: "21px 9px" }}>
            <line x1="21" y1="9" x2="26" y2="7" stroke="#b91c1c" strokeWidth="0.9" strokeLinecap="round" />
          </g>
          <g style={{ animation: isPaused ? "none" : "bugLegWiggle 0.2s ease-in-out infinite 0.16s", transformOrigin: "21px 12px" }}>
            <line x1="21" y1="12" x2="26" y2="12" stroke="#b91c1c" strokeWidth="0.9" strokeLinecap="round" />
          </g>
          <g style={{ animation: isPaused ? "none" : "bugLegWiggle 0.2s ease-in-out infinite 0.03s", transformOrigin: "21px 15px" }}>
            <line x1="21" y1="15" x2="26" y2="17" stroke="#b91c1c" strokeWidth="0.9" strokeLinecap="round" />
          </g>

          {/* Shell gradient */}
          <defs>
            <radialGradient id="bugShell" cx="0.4" cy="0.35" r="0.65">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </>
  );
}
