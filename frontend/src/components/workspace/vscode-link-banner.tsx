"use client";

import { useMemo, useState } from "react";
import { Copy, Link2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";

const EXTENSION_ID = "itecify.itecify-vscode";
const LOCAL_BRIDGE_BASE_URL = "http://127.0.0.1:32145";

function getBackendBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return baseUrl.replace(/\/+$/, "");
}

type VsCodeLinkBannerProps = {
  documentId: string;
  title: string;
  content: string;
};

export default function VsCodeLinkBanner({
  documentId,
  title,
  content,
}: VsCodeLinkBannerProps) {
  const [copied, setCopied] = useState<"id" | "link" | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStatus, setConnectStatus] = useState<
    "idle" | "connected" | "opening"
  >("idle");

  const vscodeDeepLink = useMemo(() => {
    const params = new URLSearchParams({
      documentId,
      title,
      backendBaseUrl: getBackendBaseUrl(),
    });

    return `vscode://${EXTENSION_ID}/connect?${params.toString()}`;
  }, [documentId, title]);

  async function copyValue(value: string, kind: "id" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1500);
    } catch {
      setCopied(null);
    }
  }

  function openVsCodeUri() {
    window.location.href = vscodeDeepLink;
  }

  async function connectToVsCode() {
    setIsConnecting(true);
    setConnectStatus("idle");

    try {
      const response = await fetch(`${LOCAL_BRIDGE_BASE_URL}/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          title,
          backendBaseUrl: getBackendBaseUrl(),
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(`Bridge responded with ${response.status}`);
      }

      setConnectStatus("connected");
    } catch {
      openVsCodeUri();
      setConnectStatus("opening");
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-border bg-secondary/30 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-foreground">
          <Link2 className="h-4 w-4" />
          VS Code Sync
        </div>
        <p className="text-sm text-muted-foreground">
          This workspace is linked by document ID. Connect from here to open the iTECify VS Code
          extension, then use the explicit Push/Pull actions from VS Code instead of background
          syncing.
        </p>
        <p className="text-xs text-muted-foreground">
          Current document: <span className="font-mono text-foreground">{documentId}</span>
        </p>
        {connectStatus === "connected" && (
          <p className="text-xs text-emerald-300">
            A running VS Code instance received this workspace. Push or pull from the editor when
            you are ready.
          </p>
        )}
        {connectStatus === "opening" && (
          <p className="text-xs text-blue-400">
            No running local bridge was found, so the app is opening VS Code through the extension
            URI instead. If VS Code says the extension was not found, install the local extension
            from <span className="font-mono">vscode-extension</span> once, reload VS Code, and try again.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => void connectToVsCode()}
          disabled={isConnecting}
        >
          <PlugZap className="h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect VS Code"}
        </Button>

        <Button
          variant="outline"
          onClick={() => void copyValue(documentId, "id")}
        >
          <Copy className="h-4 w-4" />
          {copied === "id" ? "Copied ID" : "Copy ID"}
        </Button>

        <Button
          variant="outline"
          onClick={() => void copyValue(vscodeDeepLink, "link")}
        >
          <Copy className="h-4 w-4" />
          {copied === "link" ? "Copied URI" : "Copy VS Code URI"}
        </Button>
      </div>
    </div>
  );
}
