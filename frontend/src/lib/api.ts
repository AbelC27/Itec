import type { Document } from "@/types/database";
import type { ExecutionHistoryEntry } from "@/types/execution-history";

type ApiErrorPayload = {
    message?: string;
    detail?: string;
};

export class ApiError extends Error {
    status: number;
    payload?: ApiErrorPayload;

    constructor(status: number, message: string, payload?: ApiErrorPayload) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.payload = payload;
    }
}

export type SessionParticipant = {
    name: string;
    initials: string;
};

export type ActiveSession = {
    id: string;
    name: string;
    description: string;
    stack: string;
    status: string;
    membersActive: number;
    openFiles: number;
    participants: SessionParticipant[];
};

export type CreateSessionRequest = {
    name: string;
    description?: string;
    stack?: string;
    language?: string;
};

export type ScanResourcesResponse = {
    mem_limit?: string;
    nano_cpus?: number;
    notes?: string[];
    [key: string]: unknown;
};

export type ExecuteCodeResponse = {
    stdout?: string;
    stderr?: string;
    execution_time?: number;
    exit_code?: number;
    timed_out?: boolean;
    [key: string]: unknown;
};

function getApiBaseUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_API_URL is not set");
    }
    return baseUrl.replace(/\/+$/, "");
}

export function getWsBaseUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_WS_URL is not set");
    }
    return baseUrl.replace(/\/+$/, "");
}

async function parseJson<T>(response: Response): Promise<T> {
    if (response.status === 204) {
        return undefined as T;
    }
    return (await response.json()) as T;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
    });

    if (!response.ok) {
        let payload: ApiErrorPayload | undefined;
        try {
            payload = (await response.json()) as ApiErrorPayload;
        } catch {
            payload = undefined;
        }
        const message = payload?.message ?? payload?.detail ?? response.statusText;
        throw new ApiError(response.status, message, payload);
    }

    return parseJson<T>(response);
}

export async function getActiveSessions(init?: RequestInit): Promise<ActiveSession[]> {
    return fetchJson<ActiveSession[]>("/api/sessions/active", init);
}

export async function createSession(
    data: CreateSessionRequest,
    init?: RequestInit
): Promise<ActiveSession> {
    return fetchJson<ActiveSession>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(data),
        ...init,
    });
}

export async function scanCodePreExecution(
    code: string,
    init?: RequestInit
): Promise<ScanResourcesResponse> {
    return fetchJson<ScanResourcesResponse>("/api/ai/scan-resources", {
        method: "POST",
        body: JSON.stringify({ code }),
        ...init,
    });
}

export async function executeCode(
    code: string,
    language: string,
    init?: RequestInit
): Promise<ExecuteCodeResponse> {
    return fetchJson<ExecuteCodeResponse>("/api/execute", {
        method: "POST",
        body: JSON.stringify({ code, language }),
        ...init,
    });
}

// ── Document Management ──────────────────────────────────────────────

export async function getDocuments(init?: RequestInit): Promise<Document[]> {
    return fetchJson<Document[]>("/api/documents", init);
}

export async function getDocument(
    documentId: string,
    init?: RequestInit
): Promise<Document> {
    return fetchJson<Document>(`/api/documents/${documentId}`, init);
}

export async function createDocument(
    data: { title: string; language: string },
    init?: RequestInit
): Promise<Document> {
    return fetchJson<Document>("/api/documents", {
        method: "POST",
        body: JSON.stringify(data),
        ...init,
    });
}

export async function deleteDocument(
    documentId: string,
    init?: RequestInit
): Promise<void> {
    return fetchJson<void>(`/api/documents/${documentId}`, {
        method: "DELETE",
        ...init,
    });
}

export async function getDocumentHistory(
    documentId: string,
    init?: RequestInit
): Promise<ExecutionHistoryEntry[]> {
    return fetchJson<ExecutionHistoryEntry[]>(
        `/api/documents/${documentId}/history`,
        init
    );
}

export type DocumentSyncPullResponse = {
    document_id: string;
    content: string;
};

export async function pushDocumentContent(
    documentId: string,
    content: string,
    baseContent?: string,
    init?: RequestInit
): Promise<{ status: string; document_id: string }> {
    return fetchJson<{ status: string; document_id: string }>("/api/docs/sync/push", {
        method: "POST",
        body: JSON.stringify({
            document_id: documentId,
            content,
            ...(typeof baseContent === "string" ? { base_content: baseContent } : {}),
        }),
        ...init,
    });
}

export async function pullDocumentContent(
    documentId: string,
    init?: RequestInit
): Promise<DocumentSyncPullResponse> {
    return fetchJson<DocumentSyncPullResponse>(
        `/api/docs/sync/pull?id=${encodeURIComponent(documentId)}`,
        init
    );
}

export type ExplainErrorRequest = {
    language: string;
    code: string;
    stderr: string;
};

export type ExplainErrorResponse = {
    explanation: string;
};

export async function explainError(
    data: ExplainErrorRequest,
    init?: RequestInit
): Promise<ExplainErrorResponse> {
    return fetchJson<ExplainErrorResponse>("/api/ai/explain", {
        method: "POST",
        body: JSON.stringify(data),
        ...init,
    });
}

export type AiChatRequest = {
  message: string;
  code: string;
  history?: { role: string; content: string }[];
  /** Drives Socratic (student) vs full assistant (teacher) system prompts. */
  user_role?: "student" | "teacher";
};

export type ExecutionTelemetryAlert = {
  kind: string;
  session_id: string;
  consecutive_failures: number;
  message: string;
};

export type AiChatResponse = {
  reply: string;
};

export async function sendAiChat(
  data: AiChatRequest,
  init?: RequestInit
): Promise<AiChatResponse> {
  return fetchJson<AiChatResponse>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify(data),
    ...init,
  });
}

export async function getExecutionTelemetryAlerts(
  init?: RequestInit
): Promise<ExecutionTelemetryAlert[]> {
  return fetchJson<ExecutionTelemetryAlert[]>("/api/ai/telemetry/execution-alerts", {
    ...init,
  });
}

// ── AI Chat Sessions ─────────────────────────────────────────────────

export type AiChatSession = {
    id: string;
    document_id: string;
    title: string;
    created_at: string;
    updated_at: string;
};

export type AiChatMessageRecord = {
    id: string;
    session_id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
};

export async function getChatSessions(
    documentId: string,
    userId?: string,
    init?: RequestInit
): Promise<AiChatSession[]> {
    const params = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
    return fetchJson<AiChatSession[]>(`/api/chats/${documentId}/sessions${params}`, init);
}

export async function createChatSession(
    documentId: string,
    title = "New Chat",
    userId?: string,
    init?: RequestInit
): Promise<AiChatSession> {
    return fetchJson<AiChatSession>(`/api/chats/${documentId}/sessions`, {
        method: "POST",
        body: JSON.stringify({ document_id: documentId, title, user_id: userId ?? "" }),
        ...init,
    });
}

export async function deleteChatSession(
    sessionId: string,
    init?: RequestInit
): Promise<void> {
    return fetchJson<void>(`/api/chats/sessions/${sessionId}`, {
        method: "DELETE",
        ...init,
    });
}

export async function getChatMessages(
    sessionId: string,
    init?: RequestInit
): Promise<AiChatMessageRecord[]> {
    return fetchJson<AiChatMessageRecord[]>(
        `/api/chats/sessions/${sessionId}/messages`,
        init
    );
}

export async function saveChatMessage(
    sessionId: string,
    role: string,
    content: string,
    init?: RequestInit
): Promise<AiChatMessageRecord> {
    return fetchJson<AiChatMessageRecord>(
        `/api/chats/sessions/${sessionId}/messages`,
        {
            method: "POST",
            body: JSON.stringify({ role, content }),
            ...init,
        }
    );
}
