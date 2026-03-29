"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSessionSpec, putSessionSpec } from "@/lib/api";

interface SpecDialogProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SpecDialog({
  sessionId,
  open,
  onOpenChange,
}: SpecDialogProps) {
  const [spec, setSpec] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open || !sessionId) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    getSessionSpec(sessionId)
      .then((res) => setSpec(res.spec_markdown ?? ""))
      .catch(() => setSpec(""))
      .finally(() => setLoading(false));
  }, [open, sessionId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await putSessionSpec(sessionId, spec);
      setSaved(true);
      setTimeout(() => onOpenChange(false), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save spec");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assignment Spec</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
            Loading spec…
          </div>
        ) : (
          <textarea
            className="w-full min-h-[240px] rounded-lg border border-border bg-background p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Paste your assignment rubric in Markdown…"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
          />
        )}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        {saved && (
          <p className="text-xs text-emerald-400">Spec saved.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
