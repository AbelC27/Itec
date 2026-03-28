"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";

export default function Home() {
  const { user, isLoading } = useAuth();

  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          AI-Augmented Collaborative Sandbox
        </h1>
        <p className="max-w-xl text-lg text-text-secondary">
          Build, collaborate, and experiment in real-time with AI-powered
          assistance.
        </p>

        {!isLoading && (
          <div className="flex gap-4 mt-4">
            {user ? (
              <Link
                href="/homepage"
                className="inline-flex h-11 items-center justify-center rounded-[var(--radius-input)] bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                Go to Homepage
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="inline-flex h-11 items-center justify-center rounded-[var(--radius-input)] bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent/90"
                >
                  Get Started
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex h-11 items-center justify-center rounded-[var(--radius-input)] border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                >
                  Log In
                </Link>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
