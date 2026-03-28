"use client";

import { useMemo } from "react";
import { Bot, Loader2, ShieldCheck, FlaskConical, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { SwarmStatus } from "@/types/swarm";

interface AIAvatarIndicatorProps {
  status: SwarmStatus;
  retryCount?: number;
  hasError?: boolean;
}

export default function AIAvatarIndicator({
  status,
  retryCount = 0,
  hasError = false,
}: AIAvatarIndicatorProps) {
  const { icon: Icon, label, colorClass, animationClass } = useMemo(() => {
    // Error or stressed state
    if (hasError || retryCount > 0) {
      return {
        icon: AlertTriangle,
        label: retryCount > 0 ? `Retrying (${retryCount}/3)` : "Error",
        colorClass: "text-destructive",
        animationClass: "animate-pulse",
      };
    }

    switch (status) {
      case "generating":
        return {
          icon: Bot,
          label: "Generating Code",
          colorClass: "text-primary",
          animationClass: "animate-pulse",
        };

      case "reviewing":
        return {
          icon: ShieldCheck,
          label: "Security Review",
          colorClass: "text-blue-400",
          animationClass: "animate-spin",
        };

      case "testing":
        return {
          icon: FlaskConical,
          label: "Testing in Sandbox",
          colorClass: "text-purple-400",
          animationClass: "animate-spin",
        };

      case "complete":
        return {
          icon: CheckCircle2,
          label: "Complete",
          colorClass: "text-emerald-400",
          animationClass: "",
        };

      case "error":
        return {
          icon: AlertTriangle,
          label: "Failed",
          colorClass: "text-destructive",
          animationClass: "",
        };

      case "idle":
      default:
        return {
          icon: Bot,
          label: "Ready",
          colorClass: "text-muted-foreground",
          animationClass: "",
        };
    }
  }, [status, retryCount, hasError]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className={`${colorClass} ${animationClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">AI Agent</span>
        <span className={`text-sm font-medium ${colorClass}`}>{label}</span>
      </div>
    </div>
  );
}
