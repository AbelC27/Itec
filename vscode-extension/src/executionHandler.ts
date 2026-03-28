import * as vscode from "vscode";
import WebSocket from "ws";

// --- Interfaces and Types ---

export interface ExecutionPayload {
  language: "python" | "javascript";
  code: string;
}

export type WsMessage =
  | { type: "status"; data: string }
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "complete"; data: { execution_time: number; exit_code: number } }
  | { type: "error"; data: string }
  | { type: "easter_egg"; data: string };

export interface ExecutionOptions {
  language: string;
  code: string;
  documentId: string;
  documentUri?: vscode.Uri;
  outputChannel: vscode.OutputChannel;
}

export const LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  javascriptreact: "javascript",
};

// --- AI Explanation Helper ---

interface AiFixResponse {
  error_explanation: string;
  suggested_fix: string;
  original_code: string;
}

async function getTargetEditor(
  documentUri?: vscode.Uri
): Promise<vscode.TextEditor | undefined> {
  if (!documentUri) {
    return vscode.window.activeTextEditor;
  }

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document.uri.toString() === documentUri.toString()) {
    return activeEditor;
  }

  const document = await vscode.workspace.openTextDocument(documentUri);
  return vscode.window.showTextDocument(document, { preview: false, preserveFocus: false });
}

async function applySuggestedFix(
  documentUri: vscode.Uri | undefined,
  originalCode: string,
  suggestedFix: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const editor = await getTargetEditor(documentUri);
  if (!editor) {
    vscode.window.showErrorMessage("iTECify: No editor available to apply the fix.");
    return;
  }

  const documentText = editor.document.getText();
  let startIndex = documentText.indexOf(originalCode);
  let replacementLength = originalCode.length;

  if (startIndex === -1) {
    const trimmedOriginal = originalCode.trim();
    if (trimmedOriginal) {
      startIndex = documentText.indexOf(trimmedOriginal);
      replacementLength = trimmedOriginal.length;
    }
  }

  if (startIndex === -1) {
    vscode.window.showWarningMessage(
      "iTECify: Could not find the original code snippet to replace."
    );
    return;
  }

  const startPos = editor.document.positionAt(startIndex);
  const endPos = editor.document.positionAt(startIndex + replacementLength);
  const applied = await editor.edit((editBuilder) => {
    editBuilder.replace(new vscode.Range(startPos, endPos), suggestedFix);
  });

  if (applied) {
    outputChannel.appendLine("[iTECify AI] Applied suggested fix.");
  } else {
    outputChannel.appendLine("[iTECify AI] Failed to apply suggested fix.");
  }
}

async function requestAiExplanation(
  language: string,
  code: string,
  stderr: string,
  documentUri: vscode.Uri | undefined,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    outputChannel.appendLine("[iTECify AI] Analyzing error...");
    const response = await fetch("http://localhost:8000/api/ai/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, code, stderr }),
    });
    if (response.ok) {
      const data = (await response.json()) as AiFixResponse;
      outputChannel.appendLine("[iTECify AI] " + data.error_explanation);

      const hasSuggestion =
        data.suggested_fix && data.suggested_fix.trim() &&
        data.original_code && data.original_code.trim();

      if (hasSuggestion) {
        const selection = await vscode.window.showInformationMessage(
          "iTECify: AI suggested a fix.",
          "Accept Fix",
          "Reject"
        );

        if (selection === "Accept Fix") {
          await applySuggestedFix(
            documentUri,
            data.original_code,
            data.suggested_fix,
            outputChannel
          );
        }
      }
    } else {
      outputChannel.appendLine(
        "[iTECify AI] Could not reach the iTECify backend for error analysis."
      );
    }
  } catch {
    outputChannel.appendLine(
      "[iTECify AI] Could not reach the iTECify backend for error analysis."
    );
  }
}

// --- Execution Function ---

export function executeCode(options: ExecutionOptions): Promise<void> {
  const { language, code, documentId, documentUri, outputChannel } = options;

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let stderrBuffer = "";

    const ws = new WebSocket(`ws://localhost:8000/ws/execute/${documentId}`);

    ws.on("open", () => {
      outputChannel.appendLine("[iTECify] Connected. Sending code...");
      const payload: ExecutionPayload = {
        language: language as "python" | "javascript",
        code,
      };
      ws.send(JSON.stringify(payload));
    });

    ws.on("message", (rawData: WebSocket.Data) => {
      const msg: WsMessage = JSON.parse(rawData.toString());

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
          outputChannel.appendLine(
            "\n✓ Execution complete in " +
            msg.data.execution_time +
            "s (exit code: " +
            msg.data.exit_code +
            ")"
          );
          vscode.window.showInformationMessage(
            "iTECify: Execution complete (" + msg.data.execution_time + "s)"
          );
          if (msg.data.exit_code > 0 && stderrBuffer.length > 0) {
            vscode.window
              .showErrorMessage(
                "iTECify: Execution failed (exit code " +
                msg.data.exit_code +
                ")",
                "🤖 Explain with AI"
              )
              .then((selection) => {
                if (selection === "🤖 Explain with AI") {
                  requestAiExplanation(
                    language,
                    code,
                    stderrBuffer,
                    documentUri,
                    outputChannel
                  );
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

        case "easter_egg":
          vscode.window.showInformationMessage(msg.data);
          outputChannel.appendLine(
            "\n" +
            "╔══════════════════════════════════════╗\n" +
            "║   🎉 iTEC 2026 Easter Egg Found! 🎉  ║\n" +
            "║      You are a true explorer!        ║\n" +
            "╚══════════════════════════════════════╝"
          );
          break;
      }
    });

    ws.on("error", () => {
      outputChannel.appendLine(
        "[Error] Cannot connect to iTECify backend. Is the server running on localhost:8000?"
      );
      vscode.window.showErrorMessage(
        "iTECify: Cannot connect to backend. Ensure the server is running."
      );
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
