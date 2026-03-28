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
let isExecuting = false;
function detectLanguage(editor) {
    return executionHandler_1.LANGUAGE_MAP[editor.document.languageId];
}
async function runCloudExecution(outputChannel) {
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
    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`[iTECify] Running ${language} code in cloud...`);
    isExecuting = true;
    try {
        await (0, executionHandler_1.executeCode)({
            language,
            code,
            documentId: "vscode-local-run",
            outputChannel,
        });
    }
    finally {
        isExecuting = false;
    }
}
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("iTECify Cloud Run");
    const disposable = vscode.commands.registerCommand("itecify.runCloudExecution", () => runCloudExecution(outputChannel));
    context.subscriptions.push(disposable, outputChannel);
}
function deactivate() { }
