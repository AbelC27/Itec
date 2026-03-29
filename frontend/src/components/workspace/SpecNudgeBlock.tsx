"use client";

import { X, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComplianceNudge } from "@/types/swarm";

interface SpecNudgeBlockProps {
  nudge: ComplianceNudge;
  onDismiss: () => void;
}

export default function SpecNudgeBlock({ nudge, onDismiss }: SpecNudgeBlockProps) {
  const isCompliant = nudge.compliant;

  return (
    <div
      className={`animate-in slide-in-from-top-2 fade-in duration-300 rounded-xl border p-4 ${
        isCompliant
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-violet-500/30 bg-violet-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              isCompliant ? "bg-emerald-500/10 text-emerald-400" : "bg-violet-500/10 text-violet-400"
            }`}
          >
            {isCompliant ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-foreground">{nudge.message}</p>
            {nudge.missed_requirements.length > 0 && (
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                {nudge.missed_requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss spec nudge"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
