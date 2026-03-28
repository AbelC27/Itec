import type { Document } from "@/types/database";

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
