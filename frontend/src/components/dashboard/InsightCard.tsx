import { Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

type InsightCardProps = {
    stuckCount?: number;
    alertCount?: number;
};

export default function InsightCard({
    stuckCount = 0,
    alertCount = 0,
}: InsightCardProps) {
    const hasIssues = stuckCount > 0 || alertCount > 0;

    return (
        <Card className="border-white/10 bg-gradient-to-br from-blue-950/40 via-background to-background">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    AI Insight
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {hasIssues ? (
                    <>
                        {stuckCount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-rose-400">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>
                                    {stuckCount} {stuckCount === 1 ? "student" : "students"} stuck on repeated failures
                                </span>
                            </div>
                        )}
                        {alertCount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>
                                    {alertCount} active failure {alertCount === 1 ? "alert" : "alerts"}
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>All students progressing normally</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
