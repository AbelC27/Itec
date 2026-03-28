"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIPromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function AIPromptInput({
  onSubmit,
  disabled = false,
  placeholder = "Ask the AI to build something... (e.g., 'Create a function to calculate fibonacci numbers')",
}: AIPromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !disabled) {
      onSubmit(prompt.trim());
      setPrompt("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          AI Code Generator
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-[100px] w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          rows={4}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">⌘</kbd> +{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Enter</kbd> to submit
          </span>
          
          <Button
            type="submit"
            disabled={disabled || !prompt.trim()}
            size="sm"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Generate
          </Button>
        </div>
      </div>
    </form>
  );
}
