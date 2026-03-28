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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGE_MAP = void 0;
exports.executeCode = executeCode;
const vscode = __importStar(require("vscode"));
const ws_1 = __importDefault(require("ws"));
exports.LANGUAGE_MAP = {
    python: "python",
    javascript: "javascript",
    javascriptreact: "javascript",
};
// --- AI Explanation Helper ---
async function requestAiExplanation(language, code, stderr, outputChannel) {
    try {
        outputChannel.appendLine("[iTECify AI] Analyzing error...");
        const response = await fetch("http://localhost:8000/api/ai/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language, code, stderr }),
        });
        if (response.ok) {
            const data = (await response.json());
            outputChannel.appendLine("[iTECify AI] " + data.explanation);
        }
        else {
            outputChannel.appendLine("[iTECify AI] Could not reach the iTECify backend for error analysis.");
        }
    }
    catch {
        outputChannel.appendLine("[iTECify AI] Could not reach the iTECify backend for error analysis.");
    }
}
// --- Execution Function ---
function executeCode(options) {
    const { language, code, documentId, outputChannel } = options;
    return new Promise((resolve, reject) => {
        let settled = false;
        let stderrBuffer = "";
        const ws = new ws_1.default(`ws://localhost:8000/ws/execute/${documentId}`);
        ws.on("open", () => {
            outputChannel.appendLine("[iTECify] Connected. Sending code...");
            const payload = {
                language: language,
                code,
            };
            ws.send(JSON.stringify(payload));
        });
        ws.on("message", (rawData) => {
            const msg = JSON.parse(rawData.toString());
            switch (msg.type) {
                case "status":
                    outputChannel.appendLine(msg.data);
                    break;
                case "stdout":
                    outputChannel.append(msg.data);
                    break;
                case "stderr":
                    outputChannel.appendLine("[stderr] " + msg.data);
                    stderrBuffer += msg.data + "\n";
                    break;
                case "complete":
                    outputChannel.appendLine("\n✓ Execution complete in " +
                        msg.data.execution_time +
                        "s (exit code: " +
                        msg.data.exit_code +
                        ")");
                    vscode.window.showInformationMessage("iTECify: Execution complete (" + msg.data.execution_time + "s)");
                    if (msg.data.exit_code > 0 && stderrBuffer.length > 0) {
                        vscode.window
                            .showErrorMessage("iTECify: Execution failed (exit code " +
                            msg.data.exit_code +
                            ")", "🤖 Explain with AI")
                            .then((selection) => {
                            if (selection === "🤖 Explain with AI") {
                                requestAiExplanation(language, code, stderrBuffer, outputChannel);
                            }
                        });
                    }
                    ws.close();
                    if (!settled) {
                        settled = true;
                        resolve();
                    }
                    break;
                case "error":
                    outputChannel.appendLine("\n✗ [Error] " + msg.data);
                    vscode.window.showErrorMessage("iTECify: " + msg.data);
                    ws.close();
                    if (!settled) {
                        settled = true;
                        resolve();
                    }
                    break;
            }
        });
        ws.on("error", () => {
            outputChannel.appendLine("[Error] Cannot connect to iTECify backend. Is the server running on localhost:8000?");
            vscode.window.showErrorMessage("iTECify: Cannot connect to backend. Ensure the server is running.");
            if (!settled) {
                settled = true;
                reject(new Error("WebSocket connection failed"));
            }
        });
        ws.on("close", () => {
            if (!settled) {
                settled = true;
                resolve();
            }
        });
    });
}
