"use client";

import { X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TutorIntervention } from "@/types/swarm";

interface TutorInterventionBlockProps {
  intervention: TutorIntervention;
  onDismiss: () => void;
}

export default function TutorInterventionBlock({
  intervention,
  onDismiss,
}: TutorInterventionBlockProps) {
  return (
    <div className="animate-in slide-in-from-top-2 fade-in duration-300 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-foreground">
              {intervention.question}
            </p>
            <p className="text-xs text-muted-foreground">
              {intervention.root_cause_summary}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss tutor hint"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
