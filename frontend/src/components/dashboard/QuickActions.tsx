"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Plus, Loader2, AlertCircle } from "lucide-react";
import { createDocument } from "@/lib/api";
import { useActiveDocument } from "@/components/providers/active-document-provider";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

const LANGUAGES = [
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
];

export default function QuickActions() {
    const router = useRouter();
    const { setActiveDocumentId } = useActiveDocument();
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState(LANGUAGES[0].value);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!title.trim()) return;
        setIsCreating(true);
        setError(null);
        try {
            const doc = await createDocument({ title: title.trim(), language });
            setActiveDocumentId(doc.id);
            router.push("/workspace");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create document"
            );
            setIsCreating(false);
        }
    };

    return (
        <Card className="border-white/10 bg-background">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        Quick Actions
                    </h2>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>

            <CardContent>
                <div className="space-y-3">
                    {!showForm ? (
                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-white/10 px-4 py-3 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5"
                        >
                            <Plus className="h-4 w-4" />
                            New File
                        </button>
                    ) : (
                        <div className="space-y-3 rounded-lg border border-white/10 bg-secondary/50 p-4">
                            <label className="block space-y-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    Title
                                </span>
                                <Input
                                    type="text"
                                    placeholder="File title…"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleCreate();
                                    }}
                                    autoFocus
                                />
                            </label>
                            <div className="block space-y-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    Language
                                </span>
                                <Select value={language} onValueChange={(val) => setLanguage(val)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LANGUAGES.map((lang) => (
                                            <SelectItem key={lang.value} value={lang.value}>
                                                {lang.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleCreate}
                                    disabled={isCreating || !title.trim()}
                                    className="flex-1"
                                >
                                    {isCreating ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        "Create"
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowForm(false);
                                        setTitle("");
                                        setError(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
