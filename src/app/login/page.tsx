"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { GitBranch, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [devEmail, setDevEmail] = useState("");
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [loadingDev, setLoadingDev] = useState(false);
  const [error, setError] = useState("");

  async function handleGithub() {
    setLoadingGithub(true);
    setError("");
    await signIn("github", { callbackUrl });
  }

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!devEmail.trim()) return;
    setLoadingDev(true);
    setError("");

    const res = await signIn("credentials", {
      email: devEmail.trim(),
      redirect: false,
      callbackUrl,
    });

    if (res?.error) {
      setError("Login failed. Check your email.");
      setLoadingDev(false);
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo / wordmark */}
        <div className="text-center mb-10">
          <div className="flex gap-2 justify-center mb-5">
            <span className="w-2.5 h-2.5 rounded-full bg-sage inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-gold inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-terracotta inline-block" />
          </div>
          <h1 className="font-serif text-4xl font-semibold text-ink tracking-tight">
            KaizenOS
          </h1>
          <p className="mt-2 text-sm text-ink/55 font-sans">
            Your personal growth operating system
          </p>
        </div>

        {/* Card */}
        <div className="bg-parchment border border-mist rounded-2xl p-8 shadow-sm">

          {/* GitHub */}
          <button
            onClick={handleGithub}
            disabled={loadingGithub || loadingDev}
            className="w-full flex items-center justify-center gap-3 bg-ink text-cream rounded-xl px-4 py-3 text-sm font-medium font-sans transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {loadingGithub ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitBranch className="w-4 h-4" />
            )}
            Continue with GitHub
          </button>

          {/* Error */}
          {error && (
            <p className="mt-3 text-xs text-terracotta text-center">{error}</p>
          )}

          {/* Dev credentials (development only) */}
          {process.env.NODE_ENV === "development" && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-mist" />
                <span className="text-xs text-ink/35 font-sans font-medium uppercase tracking-widest">
                  dev
                </span>
                <div className="flex-1 h-px bg-mist" />
              </div>

              <form onSubmit={handleDevLogin} className="space-y-3">
                <div>
                  <label
                    htmlFor="dev-email"
                    className="block text-xs font-medium text-ink/50 font-sans mb-1.5"
                  >
                    Sign in by email (no password)
                  </label>
                  <input
                    id="dev-email"
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-mist bg-cream px-3 py-2.5 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingDev || loadingGithub || !devEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-mist bg-cream text-ink px-4 py-2.5 text-sm font-medium font-sans hover:bg-mist/50 disabled:opacity-40 transition-colors"
                >
                  {loadingDev && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Sign in
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink/30 font-sans">
          Continuous improvement, one session at a time.
        </p>
      </div>
    </main>
  );
}
