import * as vscode from "vscode";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { executeCode, LANGUAGE_MAP } from "./executionHandler";

const DEFAULT_BACKEND_BASE_URL = "http://localhost:8000";
const DOCUMENT_ID_KEY = "itecify.documentId";
const CONNECTION_KEY = "itecify.connection";
const LOCAL_BRIDGE_HOST = "127.0.0.1";
const LOCAL_BRIDGE_PORT = 32145;

type WorkspaceConnection = {
  documentId: string;
  title?: string;
  backendBaseUrl?: string;
  syncedContent?: string;
  connectedAt: string;
};

type WorkspaceConnectionInput = {
  documentId: string;
  title?: string;
  backendBaseUrl?: string;
  content?: string;
};

let isExecuting = false;
let didWarnMissingDocumentId = false;
let didWarnSyncFailure = false;

type DocumentSyncChange = {
  range_offset: number;
  range_length: number;
  text: string;
};

function normalizeBaseUrl(value: string | undefined): string {
  return (value || DEFAULT_BACKEND_BASE_URL).trim().replace(/\/+$/, "");
}

function detectLanguage(editor: vscode.TextEditor): string | undefined {
  return LANGUAGE_MAP[editor.document.languageId];
}

function getConfiguredBackendBaseUrl(): string {
  const configured = vscode.workspace
    .getConfiguration("itecify")
    .get<string>("backendBaseUrl", DEFAULT_BACKEND_BASE_URL);
  return normalizeBaseUrl(configured);
}

function getStoredConnection(
  context: vscode.ExtensionContext
): WorkspaceConnection | undefined {
  return (
    context.workspaceState.get<WorkspaceConnection>(CONNECTION_KEY) ??
    context.globalState.get<WorkspaceConnection>(CONNECTION_KEY)
  );
}

function getStoredDocumentId(
  context: vscode.ExtensionContext
): string | undefined {
  return (
    getStoredConnection(context)?.documentId ??
    context.workspaceState.get<string>(DOCUMENT_ID_KEY) ??
    context.globalState.get<string>(DOCUMENT_ID_KEY)
  );
}

function getBackendBaseUrl(context: vscode.ExtensionContext): string {
  return normalizeBaseUrl(
    getStoredConnection(context)?.backendBaseUrl ?? getConfiguredBackendBaseUrl()
  );
}

function getStoredSyncedContent(
  context: vscode.ExtensionContext
): string | undefined {
  return getStoredConnection(context)?.syncedContent;
}

async function setStoredConnection(
  context: vscode.ExtensionContext,
  connection: WorkspaceConnectionInput & { connectedAt?: string }
): Promise<void> {
  const normalized: WorkspaceConnection = {
    documentId: connection.documentId.trim(),
    title: connection.title?.trim() || undefined,
    backendBaseUrl: connection.backendBaseUrl
      ? normalizeBaseUrl(connection.backendBaseUrl)
      : undefined,
    syncedContent:
      typeof connection.content === "string" ? connection.content : undefined,
    connectedAt: connection.connectedAt ?? new Date().toISOString(),
  };

  await context.workspaceState.update(CONNECTION_KEY, normalized);
  await context.workspaceState.update(DOCUMENT_ID_KEY, normalized.documentId);

  // Clear legacy global values to prevent cross-workspace bleed.
  await context.globalState.update(CONNECTION_KEY, undefined);
  await context.globalState.update(DOCUMENT_ID_KEY, undefined);
}

async function setStoredSyncedContent(
  context: vscode.ExtensionContext,
  syncedContent: string
): Promise<void> {
  const existing = getStoredConnection(context);
  if (!existing) {
    return;
  }

  await setStoredConnection(context, {
    documentId: existing.documentId,
    title: existing.title,
    backendBaseUrl: existing.backendBaseUrl,
    content: syncedContent,
    connectedAt: existing.connectedAt,
  });
}

async function clearStoredConnection(
  context: vscode.ExtensionContext
): Promise<void> {
  await context.workspaceState.update(CONNECTION_KEY, undefined);
  await context.workspaceState.update(DOCUMENT_ID_KEY, undefined);

  // Also clear legacy global values in case they still exist.
  await context.globalState.update(CONNECTION_KEY, undefined);
  await context.globalState.update(DOCUMENT_ID_KEY, undefined);
}

async function setStoredDocumentId(
  context: vscode.ExtensionContext,
  documentId: string
): Promise<void> {
  const existing = getStoredConnection(context);
  if (existing) {
    await setStoredConnection(context, {
      documentId,
      title: existing.title,
      backendBaseUrl: existing.backendBaseUrl,
      content: existing.syncedContent,
      connectedAt: existing.connectedAt,
    });
    return;
  }

  await context.workspaceState.update(DOCUMENT_ID_KEY, documentId);

  // Clear legacy global value to avoid affecting other workspaces.
  await context.globalState.update(DOCUMENT_ID_KEY, undefined);
}

function updateConnectionStatusBar(
  statusBar: vscode.StatusBarItem,
  context: vscode.ExtensionContext
): void {
  const connection = getStoredConnection(context);
  const legacyDocumentId =
    context.workspaceState.get<string>(DOCUMENT_ID_KEY) ??
    context.globalState.get<string>(DOCUMENT_ID_KEY);
  if (!connection) {
    if (legacyDocumentId) {
      statusBar.text = `$(plug) ${legacyDocumentId.slice(0, 8)}`;
      statusBar.tooltip = [
        `iTECify workspace linked to ${legacyDocumentId}`,
        `Backend: ${getConfiguredBackendBaseUrl()}`,
        "Use Connect iTECify to relink from the web app.",
      ].join("\n");
      return;
    }

    statusBar.text = "$(plug) Connect iTECify";
    statusBar.tooltip = "iTECify: Link the current VS Code window to a workspace";
    return;
  }

  const label = connection.title || connection.documentId.slice(0, 8);
  statusBar.text = `$(plug) ${label}`;
  statusBar.tooltip = [
    `iTECify workspace linked to ${connection.documentId}`,
    `Backend: ${getBackendBaseUrl(context)}`,
    "Use iTECify Push Code and Pull Code when you want to sync.",
  ].join("\n");
}

async function linkWorkspaceConnection(
  context: vscode.ExtensionContext,
  statusBar: vscode.StatusBarItem,
  connection: WorkspaceConnectionInput,
  source: "browser" | "uri" | "manual"
): Promise<void> {
  await setStoredConnection(context, connection);

  didWarnMissingDocumentId = false;
  didWarnSyncFailure = false;
  updateConnectionStatusBar(statusBar, context);

  const linkedConnection = getStoredConnection(context);
  const connectionLabel =
    linkedConnection?.title ||
    linkedConnection?.documentId ||
    connection.documentId.trim();

  const sourceLabel =
    source === "browser"
      ? "browser"
      : source === "uri"
        ? "VS Code link"
        : "manual input";

  vscode.window.showInformationMessage(
    `iTECify: Linked to ${connectionLabel} from ${sourceLabel}. Use Push Code and Pull Code when you want to sync.`
  );
}

async function promptForDocumentId(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<string | undefined> {
  const documentId = await vscode.window.showInputBox({
    prompt,
    placeHolder: "e.g. abc123-def456",
    value: getStoredDocumentId(context),
  });

  if (!documentId?.trim()) {
    return undefined;
  }

  await setStoredDocumentId(context, documentId.trim());
  return documentId.trim();
}

async function resolveDocumentId(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<string | undefined> {
  const existing = getStoredDocumentId(context);
  if (existing) {
    didWarnMissingDocumentId = false;
    return existing;
  }

  return promptForDocumentId(context, prompt);
}

function parseConnectionUri(uri: vscode.Uri): {
  documentId?: string;
  title?: string;
  backendBaseUrl?: string;
} {
  const params = new URLSearchParams(uri.query);
  return {
    documentId: params.get("documentId")?.trim() || undefined,
    title: params.get("title")?.trim() || undefined,
    backendBaseUrl: params.get("backendBaseUrl")?.trim() || undefined,
  };
}

async function connectWorkspace(
  context: vscode.ExtensionContext,
  statusBar: vscode.StatusBarItem,
  uri?: vscode.Uri
): Promise<void> {
  let documentId: string | undefined;
  let title: string | undefined;
  let backendBaseUrl: string | undefined;

  if (uri) {
    const parsed = parseConnectionUri(uri);
    documentId = parsed.documentId;
    title = parsed.title;
    backendBaseUrl = parsed.backendBaseUrl;
  } else {
    documentId = await vscode.window.showInputBox({
      prompt: "Enter the iTECify Document ID to link this editor",
      placeHolder: "e.g. abc123-def456",
      value: getStoredDocumentId(context),
    });
  }

  if (!documentId?.trim()) {
    if (!uri) {
      vscode.window.showInformationMessage(
        "iTECify: Connection cancelled. Open a workspace in the app and click Connect VS Code, or paste a Document ID here."
      );
    }
    return;
  }

  await linkWorkspaceConnection(context, statusBar, {
    documentId: documentId.trim(),
    title,
    backendBaseUrl,
  }, uri ? "uri" : "manual");
}

function writeBridgeJson(
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
): void {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", reject);
  });
}

function startLocalBridge(
  context: vscode.ExtensionContext,
  statusBar: vscode.StatusBarItem,
  outputChannel: vscode.OutputChannel
): vscode.Disposable {
  const server = createServer((request, response) => {
    void (async () => {
      const requestUrl = new URL(
        request.url || "/",
        `http://${LOCAL_BRIDGE_HOST}:${LOCAL_BRIDGE_PORT}`
      );

      if (request.method === "OPTIONS") {
        response.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "no-store",
        });
        response.end();
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/health") {
        writeBridgeJson(response, 200, {
          ok: true,
          bridge: "itecify",
          port: LOCAL_BRIDGE_PORT,
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/connect") {
        try {
          const rawBody = await readRequestBody(request);
          const payload = JSON.parse(rawBody || "{}") as WorkspaceConnectionInput;
          const documentId = payload.documentId?.trim();

          if (!documentId) {
            writeBridgeJson(response, 400, {
              ok: false,
              error: "documentId is required",
            });
            return;
          }

          await linkWorkspaceConnection(
            context,
            statusBar,
            {
              documentId,
              title: payload.title,
              backendBaseUrl: payload.backendBaseUrl,
              content: payload.content,
            },
            "browser"
          );

          writeBridgeJson(response, 200, {
            ok: true,
            documentId,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to process bridge request";
          writeBridgeJson(response, 500, {
            ok: false,
            error: message,
          });
        }
        return;
      }

      writeBridgeJson(response, 404, {
        ok: false,
        error: "Not found",
      });
    })();
  });

  server.on("listening", () => {
    outputChannel.appendLine(
      `[iTECify] Local bridge listening on http://${LOCAL_BRIDGE_HOST}:${LOCAL_BRIDGE_PORT}`
    );
  });

  server.on("error", (error) => {
    const message =
      error instanceof Error ? error.message : "Unknown local bridge error";
    outputChannel.appendLine(`[iTECify] Local bridge error: ${message}`);
  });

  server.listen(LOCAL_BRIDGE_PORT, LOCAL_BRIDGE_HOST);

  return new vscode.Disposable(() => {
    server.close();
  });
}

async function runCloudExecution(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  if (isExecuting) {
    vscode.window.showWarningMessage(
      "iTECify: Execution already in progress."
    );
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("iTECify: No active editor found.");
    return;
  }

  const language = detectLanguage(editor);
  if (!language) {
    vscode.window.showErrorMessage(
      `iTECify: Unsupported language "${editor.document.languageId}". Only Python and JavaScript are supported.`
    );
    return;
  }

  const code = editor.document.getText();
  if (!code.trim()) {
    vscode.window.showErrorMessage("iTECify: Editor is empty.");
    return;
  }

  const documentId = await resolveDocumentId(
    context,
    "Enter the iTECify Document ID"
  );

  if (!documentId) {
    return;
  }

  outputChannel.clear();
  outputChannel.show(true);
  outputChannel.appendLine(
    `[iTECify] Running ${language} code in cloud (document: ${documentId})...`
  );

  isExecuting = true;
  try {
    await executeCode({
      language,
      code,
      documentId,
      documentUri: editor.document.uri,
      outputChannel,
    });
  } finally {
    isExecuting = false;
  }
}

function getActiveFileEditor(): vscode.TextEditor | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  if (editor.document.isUntitled || editor.document.uri.scheme !== "file") {
    return undefined;
  }

  return editor;
}

function computeSyncChanges(
  previousContent: string,
  nextContent: string
): DocumentSyncChange[] {
  if (previousContent === nextContent) {
    return [];
  }

  let start = 0;
  while (
    start < previousContent.length &&
    start < nextContent.length &&
    previousContent[start] === nextContent[start]
  ) {
    start += 1;
  }

  let previousEnd = previousContent.length;
  let nextEnd = nextContent.length;
  while (
    previousEnd > start &&
    nextEnd > start &&
    previousContent[previousEnd - 1] === nextContent[nextEnd - 1]
  ) {
    previousEnd -= 1;
    nextEnd -= 1;
  }

  return [
    {
      range_offset: start,
      range_length: previousEnd - start,
      text: nextContent.slice(start, nextEnd),
    },
  ];
}

async function syncPushDocument(
  document: vscode.TextDocument,
  context: vscode.ExtensionContext
): Promise<void> {
  if (document.isUntitled || document.uri.scheme !== "file") {
    return;
  }

  const documentId = getStoredDocumentId(context);
  if (!documentId) {
    if (!didWarnMissingDocumentId) {
      didWarnMissingDocumentId = true;
      vscode.window.showInformationMessage(
        "iTECify: Link a workspace first so Push Code knows which document to sync."
      );
    }
    return;
  }

  didWarnMissingDocumentId = false;

  const syncedContent = getStoredSyncedContent(context);
  if (typeof syncedContent !== "string") {
    if (!didWarnSyncFailure) {
      didWarnSyncFailure = true;
      vscode.window.showInformationMessage(
        "iTECify: Pull once, or reconnect from the web app, before pushing editor changes."
      );
    }
    return;
  }

  const nextContent = document.getText();
  const changes = computeSyncChanges(syncedContent, nextContent);
  if (changes.length === 0) {
    didWarnSyncFailure = false;
    return;
  }

  try {
    const response = await fetch(
      `${getBackendBaseUrl(context)}/api/docs/sync/push`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          base_content: syncedContent,
          changes,
        }),
      }
    );

    if (response.ok) {
      didWarnSyncFailure = false;
      await setStoredSyncedContent(context, nextContent);
      return;
    }

    if (!didWarnSyncFailure) {
      didWarnSyncFailure = true;
      const message = await response.text();
      const hint =
        response.status === 404
          ? "The backend responded, but the sync route was not found. Restart the FastAPI server from the current backend code."
          : response.status === 409
            ? "Remote content changed. Pull latest, then try again."
          : message;

      vscode.window.showWarningMessage(
        `iTECify: Cloud sync failed (${response.status}). ${hint || ""}`.trim()
      );
    }
  } catch {
    if (!didWarnSyncFailure) {
      didWarnSyncFailure = true;
      vscode.window.showWarningMessage(
        "iTECify: Cloud sync failed. Is the backend running?"
      );
    }
  }
}

async function pushCode(context: vscode.ExtensionContext): Promise<void> {
  const editor = getActiveFileEditor();
  if (!editor) {
    vscode.window.showErrorMessage(
      "iTECify: Open a saved file before pushing code to the cloud."
    );
    return;
  }

  await syncPushDocument(editor.document, context);
}

async function pullCode(context: vscode.ExtensionContext): Promise<void> {
  const editor = getActiveFileEditor();
  if (!editor) {
    vscode.window.showErrorMessage(
      "iTECify: Open a saved file before pulling code from the cloud."
    );
    return;
  }

  const documentId = await resolveDocumentId(
    context,
    "Enter the iTECify Document ID to pull"
  );

  if (!documentId) {
    return;
  }

  try {
    const response = await fetch(
      `${getBackendBaseUrl(context)}/api/docs/sync/pull?id=${encodeURIComponent(documentId)}`
    );

    if (!response.ok) {
      const message = await response.text();
      vscode.window.showErrorMessage(
        `iTECify: Pull failed (${response.status}). ${message || ""}`.trim()
      );
      return;
    }

    const data = (await response.json()) as { content?: string };
    const content = typeof data.content === "string" ? data.content : "";
    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(editor.document.getText().length)
    );

    const applied = await editor.edit((editBuilder) => {
      editBuilder.replace(fullRange, content);
    });

    if (!applied) {
      vscode.window.showErrorMessage("iTECify: Failed to apply pulled content.");
    }

    await setStoredSyncedContent(context, content);
    didWarnSyncFailure = false;
  } catch {
    vscode.window.showErrorMessage(
      "iTECify: Pull failed. Is the backend running?"
    );
  }
}

async function createBranch(
  context: vscode.ExtensionContext,
  statusBar: vscode.StatusBarItem
): Promise<void> {
  const parentDocumentId = await promptForDocumentId(
    context,
    "Enter the parent Document ID for the branch"
  );

  if (!parentDocumentId) {
    return;
  }

  const branchName = await vscode.window.showInputBox({
    prompt: "Enter a new branch name",
    placeHolder: "e.g. feature/refactor-auth",
  });

  if (!branchName) {
    return;
  }

  try {
    const response = await fetch(
      `${getBackendBaseUrl(context)}/api/docs/branch/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_doc_id: parentDocumentId,
          branch_name: branchName,
        }),
      }
    );

    if (!response.ok) {
      const message = await response.text();
      vscode.window.showErrorMessage(
        `iTECify: Branch creation failed (${response.status}). ${message || ""}`.trim()
      );
      return;
    }

    const data = (await response.json()) as { document_id?: string };
    if (data.document_id) {
      const existingConnection = getStoredConnection(context);
      if (existingConnection) {
        await setStoredConnection(context, {
          documentId: data.document_id,
          title: branchName,
          backendBaseUrl: existingConnection.backendBaseUrl,
          content: existingConnection.syncedContent,
          connectedAt: existingConnection.connectedAt,
        });
      } else {
        await setStoredDocumentId(context, data.document_id);
      }
      updateConnectionStatusBar(statusBar, context);
    }
    vscode.window.showInformationMessage(
      "iTECify: Branch created and set as current document."
    );
  } catch {
    vscode.window.showErrorMessage(
      "iTECify: Branch creation failed. Is the backend running?"
    );
  }
}

async function deleteBranch(
  context: vscode.ExtensionContext,
  statusBar: vscode.StatusBarItem
): Promise<void> {
  const documentId = getStoredDocumentId(context);
  if (!documentId) {
    vscode.window.showErrorMessage("iTECify: No Document ID configured.");
    return;
  }

  const confirmation = await vscode.window.showWarningMessage(
    "Are you sure you want to delete this branch?",
    { modal: true },
    "Delete"
  );

  if (confirmation !== "Delete") {
    return;
  }

  try {
    const response = await fetch(
      `${getBackendBaseUrl(context)}/api/docs/branch/delete?document_id=${encodeURIComponent(documentId)}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      const message = await response.text();
      vscode.window.showErrorMessage(
        `iTECify: Delete failed (${response.status}). ${message || ""}`.trim()
      );
      return;
    }

    await clearStoredConnection(context);
    updateConnectionStatusBar(statusBar, context);
    vscode.window.showInformationMessage("iTECify: Branch deleted.");
  } catch {
    vscode.window.showErrorMessage(
      "iTECify: Delete failed. Is the backend running?"
    );
  }
}

class ItecifyUriHandler implements vscode.UriHandler {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly statusBar: vscode.StatusBarItem
  ) {}

  async handleUri(uri: vscode.Uri): Promise<void> {
    if (uri.path !== "/connect") {
      vscode.window.showWarningMessage(
        `iTECify: Unsupported link path "${uri.path || "/"}".`
      );
      return;
    }

    await connectWorkspace(this.context, this.statusBar, uri);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("iTECify Cloud Run");

  const connectionStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    101
  );
  connectionStatusBar.command = "itecify.connectWorkspace";
  updateConnectionStatusBar(connectionStatusBar, context);
  connectionStatusBar.show();

  const runDisposable = vscode.commands.registerCommand(
    "itecify.runCloudExecution",
    () => runCloudExecution(context, outputChannel)
  );

  const pushDisposable = vscode.commands.registerCommand(
    "itecify.pushCode",
    () => pushCode(context)
  );

  const pullDisposable = vscode.commands.registerCommand(
    "itecify.pullCode",
    () => pullCode(context)
  );

  const connectDisposable = vscode.commands.registerCommand(
    "itecify.connectWorkspace",
    () => connectWorkspace(context, connectionStatusBar)
  );

  const createBranchDisposable = vscode.commands.registerCommand(
    "itecify.createBranch",
    () => createBranch(context, connectionStatusBar)
  );

  const deleteBranchDisposable = vscode.commands.registerCommand(
    "itecify.deleteBranch",
    () => deleteBranch(context, connectionStatusBar)
  );

  const uriHandler = new ItecifyUriHandler(context, connectionStatusBar);
  const uriDisposable = vscode.window.registerUriHandler(uriHandler);
  const localBridgeDisposable = startLocalBridge(
    context,
    connectionStatusBar,
    outputChannel
  );

  const newBranchStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  newBranchStatusBar.text = "$(git-branch) New Branch";
  newBranchStatusBar.command = "itecify.createBranch";
  newBranchStatusBar.tooltip = "iTECify: Create a new branch";
  newBranchStatusBar.show();

  context.subscriptions.push(
    runDisposable,
    pushDisposable,
    pullDisposable,
    connectDisposable,
    createBranchDisposable,
    deleteBranchDisposable,
    uriDisposable,
    localBridgeDisposable,
    connectionStatusBar,
    newBranchStatusBar,
    outputChannel
  );
}

export function deactivate(): void {}
