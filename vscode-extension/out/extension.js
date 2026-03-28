"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const executionHandler_1 = require("./executionHandler");
const DEFAULT_BACKEND_BASE_URL = "http://localhost:8000";
const DOCUMENT_ID_KEY = "itecify.documentId";
const CONNECTION_KEY = "itecify.connection";
const PUSH_DEBOUNCE_MS = 200;
let isExecuting = false;
let didWarnMissingDocumentId = false;
let didWarnSyncFailure = false;
let isApplyingPull = false;
let pushDebounceHandle;
function normalizeBaseUrl(value) {
    return (value || DEFAULT_BACKEND_BASE_URL).trim().replace(/\/+$/, "");
}
function detectLanguage(editor) {
    return executionHandler_1.LANGUAGE_MAP[editor.document.languageId];
}
function getConfiguredBackendBaseUrl() {
    const configured = vscode.workspace
        .getConfiguration("itecify")
        .get("backendBaseUrl", DEFAULT_BACKEND_BASE_URL);
    return normalizeBaseUrl(configured);
}
function getStoredConnection(context) {
    return context.globalState.get(CONNECTION_KEY);
}
function getStoredDocumentId(context) {
    return (getStoredConnection(context)?.documentId ??
        context.globalState.get(DOCUMENT_ID_KEY));
}
function getBackendBaseUrl(context) {
    return normalizeBaseUrl(getStoredConnection(context)?.backendBaseUrl ?? getConfiguredBackendBaseUrl());
}
async function setStoredConnection(context, connection) {
    const normalized = {
        documentId: connection.documentId.trim(),
        title: connection.title?.trim() || undefined,
        backendBaseUrl: connection.backendBaseUrl
            ? normalizeBaseUrl(connection.backendBaseUrl)
            : undefined,
        connectedAt: connection.connectedAt ?? new Date().toISOString(),
    };
    await context.globalState.update(CONNECTION_KEY, normalized);
    await context.globalState.update(DOCUMENT_ID_KEY, normalized.documentId);
}
async function clearStoredConnection(context) {
    await context.globalState.update(CONNECTION_KEY, undefined);
    await context.globalState.update(DOCUMENT_ID_KEY, undefined);
}
async function setStoredDocumentId(context, documentId) {
    const existing = getStoredConnection(context);
    if (existing) {
        await setStoredConnection(context, { ...existing, documentId });
        return;
    }
    await context.globalState.update(DOCUMENT_ID_KEY, documentId);
}
function updateConnectionStatusBar(statusBar, context) {
    const connection = getStoredConnection(context);
    const legacyDocumentId = context.globalState.get(DOCUMENT_ID_KEY);
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
        "Enter pushes to cloud. Shift+Enter pulls from cloud.",
    ].join("\n");
}
async function promptForDocumentId(context, prompt) {
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
async function resolveDocumentId(context, prompt) {
    const existing = getStoredDocumentId(context);
    if (existing) {
        didWarnMissingDocumentId = false;
        return existing;
    }
    return promptForDocumentId(context, prompt);
}
function parseConnectionUri(uri) {
    const params = new URLSearchParams(uri.query);
    return {
        documentId: params.get("documentId")?.trim() || undefined,
        title: params.get("title")?.trim() || undefined,
        backendBaseUrl: params.get("backendBaseUrl")?.trim() || undefined,
    };
}
async function connectWorkspace(context, statusBar, uri) {
    let documentId;
    let title;
    let backendBaseUrl;
    if (uri) {
        const parsed = parseConnectionUri(uri);
        documentId = parsed.documentId;
        title = parsed.title;
        backendBaseUrl = parsed.backendBaseUrl;
    }
    else {
        documentId = await vscode.window.showInputBox({
            prompt: "Enter the iTECify Document ID to link this editor",
            placeHolder: "e.g. abc123-def456",
            value: getStoredDocumentId(context),
        });
    }
    if (!documentId?.trim()) {
        if (!uri) {
            vscode.window.showInformationMessage("iTECify: Connection cancelled. Open a workspace in the app and click Connect VS Code, or paste a Document ID here.");
        }
        return;
    }
    await setStoredConnection(context, {
        documentId: documentId.trim(),
        title,
        backendBaseUrl,
    });
    didWarnMissingDocumentId = false;
    didWarnSyncFailure = false;
    updateConnectionStatusBar(statusBar, context);
    const linkedConnection = getStoredConnection(context);
    const connectionLabel = linkedConnection?.title || linkedConnection?.documentId || documentId.trim();
    vscode.window.showInformationMessage(`iTECify: Linked to ${connectionLabel}. Enter now pushes and Shift+Enter pulls.`);
}
async function runCloudExecution(context, outputChannel) {
    if (isExecuting) {
        vscode.window.showWarningMessage("iTECify: Execution already in progress.");
        return;
    }
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("iTECify: No active editor found.");
        return;
    }
    const language = detectLanguage(editor);
    if (!language) {
        vscode.window.showErrorMessage(`iTECify: Unsupported language "${editor.document.languageId}". Only Python and JavaScript are supported.`);
        return;
    }
    const code = editor.document.getText();
    if (!code.trim()) {
        vscode.window.showErrorMessage("iTECify: Editor is empty.");
        return;
    }
    const documentId = await resolveDocumentId(context, "Enter the iTECify Document ID");
    if (!documentId) {
        return;
    }
    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`[iTECify] Running ${language} code in cloud (document: ${documentId})...`);
    isExecuting = true;
    try {
        await (0, executionHandler_1.executeCode)({
            language,
            code,
            documentId,
            documentUri: editor.document.uri,
            outputChannel,
        });
    }
    finally {
        isExecuting = false;
    }
}
function isEnterChange(event) {
    return event.contentChanges.some((change) => change.text.includes("\n"));
}
function scheduleSyncPush(document, context) {
    if (pushDebounceHandle) {
        clearTimeout(pushDebounceHandle);
    }
    pushDebounceHandle = setTimeout(() => {
        void syncPushDocument(document, context);
    }, PUSH_DEBOUNCE_MS);
}
async function syncPushDocument(document, context) {
    if (document.isUntitled || document.uri.scheme !== "file") {
        return;
    }
    const documentId = getStoredDocumentId(context);
    if (!documentId) {
        if (!didWarnMissingDocumentId) {
            didWarnMissingDocumentId = true;
            vscode.window.showInformationMessage("iTECify: Link a workspace first so Enter can push code to the cloud.");
        }
        return;
    }
    didWarnMissingDocumentId = false;
    try {
        const response = await fetch(`${getBackendBaseUrl(context)}/api/docs/sync/push`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                document_id: documentId,
                content: document.getText(),
            }),
        });
        if (response.ok) {
            didWarnSyncFailure = false;
            return;
        }
        if (!didWarnSyncFailure) {
            didWarnSyncFailure = true;
            const message = await response.text();
            const hint = response.status === 404
                ? "The backend responded, but the sync route was not found. Restart the FastAPI server from the current backend code."
                : message;
            vscode.window.showWarningMessage(`iTECify: Cloud sync failed (${response.status}). ${hint || ""}`.trim());
        }
    }
    catch {
        if (!didWarnSyncFailure) {
            didWarnSyncFailure = true;
            vscode.window.showWarningMessage("iTECify: Cloud sync failed. Is the backend running?");
        }
    }
}
async function pullCode(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("iTECify: No active editor found.");
        return;
    }
    const documentId = await resolveDocumentId(context, "Enter the iTECify Document ID to pull");
    if (!documentId) {
        return;
    }
    try {
        const response = await fetch(`${getBackendBaseUrl(context)}/api/docs/sync/pull?id=${encodeURIComponent(documentId)}`);
        if (!response.ok) {
            const message = await response.text();
            vscode.window.showErrorMessage(`iTECify: Pull failed (${response.status}). ${message || ""}`.trim());
            return;
        }
        const data = (await response.json());
        const content = typeof data.content === "string" ? data.content : "";
        const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(editor.document.getText().length));
        isApplyingPull = true;
        try {
            const applied = await editor.edit((editBuilder) => {
                editBuilder.replace(fullRange, content);
            });
            if (!applied) {
                vscode.window.showErrorMessage("iTECify: Failed to apply pulled content.");
            }
        }
        finally {
            isApplyingPull = false;
        }
    }
    catch {
        vscode.window.showErrorMessage("iTECify: Pull failed. Is the backend running?");
    }
}
async function createBranch(context, statusBar) {
    const parentDocumentId = await promptForDocumentId(context, "Enter the parent Document ID for the branch");
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
        const response = await fetch(`${getBackendBaseUrl(context)}/api/docs/branch/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                parent_doc_id: parentDocumentId,
                branch_name: branchName,
            }),
        });
        if (!response.ok) {
            const message = await response.text();
            vscode.window.showErrorMessage(`iTECify: Branch creation failed (${response.status}). ${message || ""}`.trim());
            return;
        }
        const data = (await response.json());
        if (data.document_id) {
            const existingConnection = getStoredConnection(context);
            if (existingConnection) {
                await setStoredConnection(context, {
                    ...existingConnection,
                    documentId: data.document_id,
                    title: branchName,
                });
            }
            else {
                await setStoredDocumentId(context, data.document_id);
            }
            updateConnectionStatusBar(statusBar, context);
        }
        vscode.window.showInformationMessage("iTECify: Branch created and set as current document.");
    }
    catch {
        vscode.window.showErrorMessage("iTECify: Branch creation failed. Is the backend running?");
    }
}
async function deleteBranch(context, statusBar) {
    const documentId = getStoredDocumentId(context);
    if (!documentId) {
        vscode.window.showErrorMessage("iTECify: No Document ID configured.");
        return;
    }
    const confirmation = await vscode.window.showWarningMessage("Are you sure you want to delete this branch?", { modal: true }, "Delete");
    if (confirmation !== "Delete") {
        return;
    }
    try {
        const response = await fetch(`${getBackendBaseUrl(context)}/api/docs/branch/delete?document_id=${encodeURIComponent(documentId)}`, { method: "DELETE" });
        if (!response.ok) {
            const message = await response.text();
            vscode.window.showErrorMessage(`iTECify: Delete failed (${response.status}). ${message || ""}`.trim());
            return;
        }
        await clearStoredConnection(context);
        updateConnectionStatusBar(statusBar, context);
        vscode.window.showInformationMessage("iTECify: Branch deleted.");
    }
    catch {
        vscode.window.showErrorMessage("iTECify: Delete failed. Is the backend running?");
    }
}
class ItecifyUriHandler {
    constructor(context, statusBar) {
        this.context = context;
        this.statusBar = statusBar;
    }
    async handleUri(uri) {
        if (uri.path !== "/connect") {
            vscode.window.showWarningMessage(`iTECify: Unsupported link path "${uri.path || "/"}".`);
            return;
        }
        await connectWorkspace(this.context, this.statusBar, uri);
    }
}
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("iTECify Cloud Run");
    const connectionStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);
    connectionStatusBar.command = "itecify.connectWorkspace";
    updateConnectionStatusBar(connectionStatusBar, context);
    connectionStatusBar.show();
    const runDisposable = vscode.commands.registerCommand("itecify.runCloudExecution", () => runCloudExecution(context, outputChannel));
    const pullDisposable = vscode.commands.registerCommand("itecify.pullCode", () => pullCode(context));
    const connectDisposable = vscode.commands.registerCommand("itecify.connectWorkspace", () => connectWorkspace(context, connectionStatusBar));
    const createBranchDisposable = vscode.commands.registerCommand("itecify.createBranch", () => createBranch(context, connectionStatusBar));
    const deleteBranchDisposable = vscode.commands.registerCommand("itecify.deleteBranch", () => deleteBranch(context, connectionStatusBar));
    const uriHandler = new ItecifyUriHandler(context, connectionStatusBar);
    const uriDisposable = vscode.window.registerUriHandler(uriHandler);
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
        if (isApplyingPull || !isEnterChange(event)) {
            return;
        }
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor ||
            activeEditor.document.uri.toString() !== event.document.uri.toString()) {
            return;
        }
        scheduleSyncPush(event.document, context);
    });
    const newBranchStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    newBranchStatusBar.text = "$(git-branch) New Branch";
    newBranchStatusBar.command = "itecify.createBranch";
    newBranchStatusBar.tooltip = "iTECify: Create a new branch";
    newBranchStatusBar.show();
    context.subscriptions.push(runDisposable, pullDisposable, connectDisposable, createBranchDisposable, deleteBranchDisposable, uriDisposable, changeDisposable, connectionStatusBar, newBranchStatusBar, outputChannel);
}
function deactivate() { }
