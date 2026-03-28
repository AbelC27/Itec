"use client";

import { useEffect, useState, useCallback } from "react";
import { getDocumentHistory } from "@/lib/api";
import type { ExecutionHistoryEntry } from "@/types/execution-history";

export function useHistory(documentId: string) {
  const [history, setHistory] = useState<ExecutionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDocumentHistory(documentId);
      setHistory(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load execution history"
      );
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return { history, isLoading, error, refresh: loadHistory };
}
