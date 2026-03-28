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
const BACKEND_BASE_URL = "http://localhost:8000";
const DOCUMENT_ID_KEY = "itecify.documentId";
let isExecuting = false;
let didWarnMissingDocumentId = false;
let didWarnSyncFailure = false;
let isApplyingPull = false;
let pushDebounceHandle;
const PUSH_DEBOUNCE_MS = 200;
function detectLanguage(editor) {
    return executionHandler_1.LANGUAGE_MAP[editor.document.languageId];
}
function getStoredDocumentId(context) {
    return context.globalState.get(DOCUMENT_ID_KEY);
}
async function setStoredDocumentId(context, documentId) {
    await context.globalState.update(DOCUMENT_ID_KEY, documentId);
}
async function promptForDocumentId(context, prompt) {
    const documentId = await vscode.window.showInputBox({
        prompt,
        placeHolder: "e.g. abc123-def456",
        value: getStoredDocumentId(context),
    });
    if (!documentId) {
        return undefined;
    }
    await setStoredDocumentId(context, documentId);
    return documentId;
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
    const documentId = await promptForDocumentId(context, "Enter the iTECify Document ID");
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
            vscode.window.showInformationMessage("iTECify: Set a Document ID to enable cloud sync.");
        }
        return;
    }
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/docs/sync/push`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                document_id: documentId,
                content: document.getText(),
            }),
        });
        if (!response.ok && !didWarnSyncFailure) {
            didWarnSyncFailure = true;
            const message = await response.text();
            vscode.window.showWarningMessage(`iTECify: Cloud sync failed (${response.status}). ${message || ""}`.trim());
        }
    }
    catch (error) {
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
    const documentId = await promptForDocumentId(context, "Enter the iTECify Document ID to pull");
    if (!documentId) {
        return;
    }
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/docs/sync/pull?id=${encodeURIComponent(documentId)}`);
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
    catch (error) {
        vscode.window.showErrorMessage("iTECify: Pull failed. Is the backend running?");
    }
}
async function createBranch(context) {
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
        const response = await fetch(`${BACKEND_BASE_URL}/api/docs/branch/create`, {
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
            await setStoredDocumentId(context, data.document_id);
        }
        vscode.window.showInformationMessage("iTECify: Branch created and set as current document.");
    }
    catch (error) {
        vscode.window.showErrorMessage("iTECify: Branch creation failed. Is the backend running?");
    }
}
async function deleteBranch(context) {
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
        const response = await fetch(`${BACKEND_BASE_URL}/api/docs/branch/delete?document_id=${encodeURIComponent(documentId)}`, { method: "DELETE" });
        if (!response.ok) {
            const message = await response.text();
            vscode.window.showErrorMessage(`iTECify: Delete failed (${response.status}). ${message || ""}`.trim());
            return;
        }
        await context.globalState.update(DOCUMENT_ID_KEY, undefined);
        vscode.window.showInformationMessage("iTECify: Branch deleted.");
    }
    catch (error) {
        vscode.window.showErrorMessage("iTECify: Delete failed. Is the backend running?");
    }
}
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("iTECify Cloud Run");
    const runDisposable = vscode.commands.registerCommand("itecify.runCloudExecution", () => runCloudExecution(context, outputChannel));
    const pullDisposable = vscode.commands.registerCommand("itecify.pullCode", () => pullCode(context));
    const createBranchDisposable = vscode.commands.registerCommand("itecify.createBranch", () => createBranch(context));
    const deleteBranchDisposable = vscode.commands.registerCommand("itecify.deleteBranch", () => deleteBranch(context));
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
        if (isApplyingPull || !isEnterChange(event)) {
            return;
        }
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.uri.toString() !== event.document.uri.toString()) {
            return;
        }
        scheduleSyncPush(event.document, context);
    });
    const newBranchStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    newBranchStatusBar.text = "$(git-branch) New Branch";
    newBranchStatusBar.command = "itecify.createBranch";
    newBranchStatusBar.tooltip = "iTECify: Create a new branch";
    newBranchStatusBar.show();
    context.subscriptions.push(runDisposable, pullDisposable, createBranchDisposable, deleteBranchDisposable, changeDisposable, newBranchStatusBar, outputChannel);
}
function deactivate() { }
