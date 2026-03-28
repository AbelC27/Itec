"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading } = useAuth();

  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          AI-Augmented Collaborative Sandbox
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Build, collaborate, and experiment in real-time with AI-powered
          assistance.
        </p>

        {!isLoading && (
          <div className="flex gap-4 mt-4">
            {user ? (
              <Button asChild size="lg">
                <Link href="/homepage">
                  Go to Homepage
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/auth/signup">
                    Get Started
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/auth/login">
                    Log In
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
