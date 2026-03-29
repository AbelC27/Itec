import Link from "next/link";
import { ArrowUpRight, Code2, Radio, Users } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import type { ActiveSession } from "../../lib/api";

type ActiveSessionsProps = {
    sessions: ActiveSession[];
    isLoading?: boolean;
    error?: string | null;
    /** Open a session in the Live Telemetry / observation view (e.g. document id). */
    onSelectSession?: (session: ActiveSession) => void;
};

export default function ActiveSessions({
    sessions,
    isLoading = false,
    error = null,
    onSelectSession,
}: ActiveSessionsProps) {
    const hasSessions = sessions.length > 0;

    return (
        <Card className="border-white/10 bg-background">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                            Active Collaborative Sessions
                        </h2>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        <Link href="/homepage">View All</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                        </div>
                    ) : null}
                    {!isLoading && error ? (
                        <p className="text-xs uppercase tracking-[0.2em] text-rose-300">
                            Unable to load sessions: {error}
                        </p>
                    ) : null}
                    {!isLoading && !error && !hasSessions ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Users className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                No active sessions right now
                            </p>
                        </div>
                    ) : null}
                    {!isLoading && !error
                        ? sessions.map((session) => {
                            const visiblePeers = session.participants.slice(0, 4);
                            const extraPeers = session.participants.length - visiblePeers.length;
                            const isLive = session.status.toLowerCase().includes("live");

                            return (
                                <div
                                    key={session.id}
                                    role={onSelectSession ? "button" : undefined}
                                    tabIndex={onSelectSession ? 0 : undefined}
                                    onClick={() => onSelectSession?.(session)}
                                    onKeyDown={(e) => {
                                        if (!onSelectSession) return;
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            onSelectSession(session);
                                        }
                                    }}
                                    className={`rounded-xl border border-white/10 bg-secondary/50 p-4 transition-all duration-200 ${
                                        onSelectSession
                                            ? "cursor-pointer hover:bg-accent focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring"
                                            : "hover:bg-accent"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-background text-muted-foreground">
                                                <Code2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    {session.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {session.description}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3.5 w-3.5" />
                                                        {session.membersActive} members active
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Code2 className="h-3.5 w-3.5" />
                                                        {session.openFiles} files open
                                                    </span>
                                                    <span className="text-muted-foreground">{session.stack}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectSession?.(session);
                                            }}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-background text-muted-foreground transition hover:text-foreground"
                                            aria-label="Open live view"
                                        >
                                            <ArrowUpRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex -space-x-2">
                                            {visiblePeers.map((peer) => (
                                                <div
                                                    key={peer.name}
                                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-background text-[10px] font-semibold text-foreground"
                                                    title={peer.name}
                                                >
                                                    {peer.initials}
                                                </div>
                                            ))}
                                            {extraPeers > 0 ? (
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-secondary text-[10px] font-semibold text-muted-foreground">
                                                    +{extraPeers}
                                                </div>
                                            ) : null}
                                        </div>
                                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-foreground">
                                            <Radio className={`h-3 w-3 ${isLive ? "text-emerald-400" : "text-muted-foreground"}`} />
                                            {session.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                        : null}
                </div>
            </CardContent>
        </Card>
    );
}
