import * as vscode from "vscode";
import { executeCode, LANGUAGE_MAP } from "./executionHandler";

let isExecuting = false;

function detectLanguage(editor: vscode.TextEditor): string | undefined {
  return LANGUAGE_MAP[editor.document.languageId];
}

async function runCloudExecution(
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

  outputChannel.clear();
  outputChannel.show(true);
  outputChannel.appendLine(`[iTECify] Running ${language} code in cloud...`);

  isExecuting = true;
  try {
    await executeCode({
      language,
      code,
      documentId: "vscode-local-run",
      outputChannel,
    });
  } finally {
    isExecuting = false;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel =
    vscode.window.createOutputChannel("iTECify Cloud Run");

  const disposable = vscode.commands.registerCommand(
    "itecify.runCloudExecution",
    () => runCloudExecution(outputChannel)
  );

  context.subscriptions.push(disposable, outputChannel);
}

export function deactivate(): void {}
