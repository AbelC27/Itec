import { ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConnectedEnvironments() {
    return (
        <Card className="border-white/10 bg-background">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        Connected Environments
                    </h2>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ShieldCheck className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        No environments connected
                    </p>
                </div>
                <Button variant="outline" className="w-full mt-4">
                    Manage Environments
                </Button>
            </CardContent>
        </Card>
    );
}
