"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, validatePassword } from "@/lib/passwordPolicy";

export type AuthMode = "signin" | "signup";

type AuthFormProps = {
  /** called once sign-in/sign-up succeeds, so the caller can close its modal */
  onSuccess: () => void;
  /** fires on mount and on every signin/signup toggle, for a caller that shows its own mode-dependent heading */
  onModeChange?: (mode: AuthMode) => void;
};

const inputClasses =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function AuthForm({ onSuccess, onModeChange }: AuthFormProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onModeChange?.(mode);
    // Only mode changes matter here — re-firing on every onModeChange identity
    // change would fight callers that pass an inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // The user closing the Google popup themselves isn't an error worth surfacing.
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError(getAuthErrorMessage(err));
      }
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
      <button
        type="button"
        onClick={handleGoogle}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-2.5 font-sans text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)] disabled:opacity-40"
      >
        <GoogleIcon />
        {mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="font-sans text-[12px] text-[var(--color-ink-muted)]">or continue with email</span>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

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
