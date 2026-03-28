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
  outputChannel: vscode.OutputChannel;
}

export const LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  javascriptreact: "javascript",
};

// --- AI Explanation Helper ---

async function requestAiExplanation(
  language: string,
  code: string,
  stderr: string,
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
      const data = (await response.json()) as { explanation: string };
      outputChannel.appendLine("[iTECify AI] " + data.explanation);
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
  const { language, code, documentId, outputChannel } = options;

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
