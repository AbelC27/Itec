import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function InsightCard() {
    return (
        <Card className="border-white/10 bg-gradient-to-br from-blue-950/40 via-background to-background">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    AI Insight
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    No insights yet.
                </p>
            </CardContent>
        </Card>
    );
}
