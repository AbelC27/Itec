"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, Shield, Terminal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SwarmState } from "@/types/swarm";

interface FloatingAIBlockProps {
  state: SwarmState;
  onAccept: () => void;
  onReject: () => void;
  isVisible: boolean;
}

export default function FloatingAIBlock({
  state,
  onAccept,
  onReject,
  isVisible,
}: FloatingAIBlockProps) {
  const [isTestResultsExpanded, setIsTestResultsExpanded] = useState(false);
  const [isErrorExpanded, setIsErrorExpanded] = useState(true);

  if (!isVisible || !state || !state.generated_code) {
    return null;
  }

  const hasError = (state.error_message?.length || 0) > 0;
  const hasTestResults = (state.test_results?.length || 0) > 0;
  const isApproved = state.security_status === "approved";
  const isBlocked = state.security_status === "blocked";

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-foreground">AI Generated Code</h3>
            <p className="text-xs text-muted-foreground">
              Review the code below and accept or reject the changes
            </p>
          </div>

          {/* Security Badge */}
          {state.security_status && (
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                isApproved
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <Shield className="h-3 w-3" />
              {isApproved ? "Approved" : "Blocked"}
            </div>
          )}
        </div>

        {/* Generated Code */}
        <div className="relative">
          <div className="rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">Python</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(state.generated_code);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="max-h-[300px] overflow-auto p-4">
              <code className="text-sm text-foreground font-mono">
                {state.generated_code}
              </code>
            </pre>
          </div>
        </div>

        {/* Error Message */}
        {hasError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5">
            <button
              onClick={() => setIsErrorExpanded(!isErrorExpanded)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Error Details</span>
                {(state.retry_count || 0) > 0 && (
                  <span className="text-xs text-muted-foreground">
                    (Retry {state.retry_count}/3)
                  </span>
                )}
              </div>
              {isErrorExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {isErrorExpanded && (
              <div className="border-t border-destructive/20 px-4 py-3">
                <pre className="text-xs text-destructive font-mono whitespace-pre-wrap">
                  {state.error_message}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Test Results */}
        {hasTestResults && (
          <div className="rounded-lg border border-border bg-background">
            <button
              onClick={() => setIsTestResultsExpanded(!isTestResultsExpanded)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Test Results</span>
              </div>
              {isTestResultsExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {isTestResultsExpanded && (
              <div className="border-t border-border px-4 py-3">
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                  {state.test_results}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onReject}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
          <Button
            onClick={onAccept}
            disabled={isBlocked}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Accept & Insert
          </Button>
        </div>
      </div>
    </div>
  );
}
