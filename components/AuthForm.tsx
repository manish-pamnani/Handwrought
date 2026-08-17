"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, validatePassword } from "@/lib/passwordPolicy";

type AuthFormProps = {
  /** called once sign-in/sign-up succeeds, so the caller can close its modal */
  onSuccess: () => void;
};

const inputClasses =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]";

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      onSuccess();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-sans text-[13px] text-[var(--color-ink-muted)]">
        {mode === "signin"
          ? "Sign in to continue."
          : "Create an account to save your work across devices and unlock lifetime access."}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">Password</span>
          <input
            type="password"
            required
            minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClasses}
            placeholder="••••••••"
          />
          {mode === "signup" && (
            <span className="font-sans text-[12px] text-[var(--color-ink-muted)]">{PASSWORD_HINT}</span>
          )}
        </label>

        {error && <p className="font-sans text-[13px] text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
        >
          {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        onClick={toggleMode}
        className="w-full text-center font-sans text-[13px] text-[var(--color-ink-muted)] underline-offset-2 hover:underline"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
