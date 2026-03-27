"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

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

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true">
        <div className={styles.network}>
          <svg viewBox="0 0 560 360" role="presentation">
            <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7">
              <path d="M30 58h120" />
              <path d="M150 58v86" />
              <path d="M150 144h94" />
              <path d="M244 144v70" />
              <path d="M244 214h82" />
              <path d="M326 214v58" />
              <path d="M326 272h96" />
              <path d="M90 196h80" />
              <path d="M170 196v92" />
              <path d="M170 288h96" />
            </g>
            <g fill="currentColor" opacity="0.25">
              <circle cx="150" cy="58" r="6" />
              <circle cx="244" cy="144" r="6" />
              <circle cx="326" cy="214" r="6" />
              <circle cx="170" cy="288" r="6" />
            </g>
            <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4">
              <rect x="20" y="42" width="80" height="32" rx="10" />
              <rect x="20" y="180" width="90" height="32" rx="10" />
              <rect x="210" y="128" width="72" height="32" rx="10" />
              <rect x="298" y="256" width="78" height="32" rx="10" />
              <rect x="410" y="258" width="90" height="32" rx="10" />
            </g>
          </svg>
        </div>

        <div className={styles.codeBlock}>
          <pre>
            {`async function FetchUser(id) {
  const user = await db.users.findUnique({ id });
  return user;
}`}
          </pre>
        </div>
      </div>

      <section className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Please enter your details.</p>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Enter your e-mail"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Enter your password"
            />
          </div>

          <div className={styles.helperRow}>
            <label className={styles.checkbox}>
              <input type="checkbox" className={styles.checkboxInput} />
              Remember me
            </label>
            <a className={styles.forgotLink} href="#">
              Forgot your password?
            </a>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={isLoading} className={styles.submitButton}>
            {isLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className={styles.footerText}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className={styles.registerLink}>
            Register here
          </Link>
        </p>
      </section>

      <div className={styles.floatingPanel}>
        <button type="button" className={styles.panelButton} aria-label="Maximize">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 17L17 7M9 7h8v8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button type="button" className={`${styles.panelButton} ${styles.searchButton}`} aria-label="Search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </main>
  );
}
