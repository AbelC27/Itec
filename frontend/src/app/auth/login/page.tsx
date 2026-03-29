"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Invalid login credentials");
        return;
      }

      router.push("/homepage");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center bg-background p-6">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(37, 99, 235, 0.18), transparent 55%)",
        }}
      />

      <section className="animate-in fade-in-0 slide-in-from-bottom-4 relative w-full max-w-md rounded-2xl border border-border bg-card p-8 duration-500">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please enter your details.</p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your e-mail"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-transparent accent-foreground"
              />
              Remember me
            </label>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Forgot your password?
            </a>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-foreground font-medium hover:underline">
            Register here
          </Link>
        </p>
      </section>
    </main>
  );
}
