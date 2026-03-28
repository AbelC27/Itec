import * as vscode from "vscode";
import WebSocket from "ws";

// --- Interfaces and Types ---

export interface ExecutionPayload {
  language: "python" | "javascript";
  code: string;
  document_id: string;
}

export type WsMessage =
  | { type: "status"; data: string }
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "complete"; data: { execution_time: number; exit_code: number } }
  | { type: "error"; data: string };

export interface ExecutionOptions {
  language: string;
  code: string;
  documentId: string;
  outputChannel: vscode.OutputChannel;
}

export const LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  javascriptreact: "javascript",
};

// --- Execution Function ---

export function executeCode(options: ExecutionOptions): Promise<void> {
  const { language, code, documentId, outputChannel } = options;

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const ws = new WebSocket("ws://localhost:8000/ws/execute");

    ws.on("open", () => {
      outputChannel.appendLine("[iTECify] Connected. Sending code...");
      const payload: ExecutionPayload = {
        language: language as "python" | "javascript",
        code,
        document_id: documentId,
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
