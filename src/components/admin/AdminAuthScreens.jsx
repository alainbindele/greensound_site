import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck, LogIn, AlertCircle } from "lucide-react";
import { SpotlightCard } from "@/components/kit";
import { useAuth } from "@/lib/AuthContext";

/**
 * Gate screens shared by the admin pages.
 *
 * The sign-in form posts to the local API, which replies with an HTTP-only
 * session cookie. After a successful sign-in the page is reloaded rather than
 * patched in place: it is a once-per-session action, and a reload guarantees
 * every panel re-reads its data with the new session instead of relying on
 * each page to re-run its own auth check.
 */

const COPY = {
  it: {
    heading: "Area riservata",
    email: "Email",
    password: "Password",
    submit: "Accedi",
    submitting: "Accesso in corso…",
    generic: "Accesso non riuscito. Riprova.",
  },
  en: {
    heading: "Restricted area",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    generic: "Sign-in failed. Please try again.",
  },
};

export function AdminLoginRequired({
  message,
  buttonLabel,
  language = "it",
  // Where to land after signing in. Defaults to reloading the current page,
  // which is what an admin panel wants; the dedicated /Login page passes a
  // destination instead.
  redirectTo,
}) {
  const { login } = useAuth();
  const t = COPY[language] || COPY.it;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      // A full navigation rather than a client-side one: every panel then
      // mounts fresh with the new session instead of relying on each page to
      // re-run its own auth check.
      if (redirectTo) window.location.assign(redirectTo);
      else window.location.reload();
    } catch (err) {
      // The API deliberately does not say which field was wrong.
      setError(err?.message || t.generic);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-24">
      <SpotlightCard interactive={false} className="w-full max-w-md">
        <form onSubmit={onSubmit} className="p-10">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 ring-1 ring-inset ring-brand/25">
              <ShieldCheck className="h-5 w-5 text-brand" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-semibold leading-snug">{t.heading}</h1>
            {message && (
              <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-inset ring-destructive/30"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-sm font-medium">
                {t.email}
              </label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-2 block text-sm font-medium">
                {t.password}
              </label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="mt-8 h-14 w-full rounded-full bg-brand-solid text-base font-semibold text-primary-foreground shadow-glow transition-transform hover:bg-brand-solid/90 hover:scale-[1.02] active:scale-100"
          >
            <LogIn className="mr-2.5 h-5 w-5" aria-hidden="true" />
            {submitting ? t.submitting : buttonLabel || t.submit}
          </Button>
        </form>
      </SpotlightCard>
    </div>
  );
}

export function AdminAccessDenied({ title, message, email }) {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-24">
      <SpotlightCard interactive={false} className="w-full max-w-md">
        <div className="p-10 text-center">
          <span className="mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-inset ring-destructive/30">
            <Lock className="h-5 w-5 text-destructive" aria-hidden="true" />
          </span>

          <h1 className="mb-3 text-xl font-semibold text-destructive">{title}</h1>
          <p className="text-muted-foreground">{message}</p>

          {/* Showing the signed-in account, plus a way out of it, turns a dead
              end into something the visitor can act on. */}
          {email && (
            <p className="mt-6 break-all rounded-lg bg-muted px-4 py-3 font-mono text-xs text-muted-foreground">
              {email}
            </p>
          )}

          <Button
            variant="outline"
            className="mt-6 rounded-full"
            onClick={async () => {
              await logout();
              window.location.reload();
            }}
          >
            Esci
          </Button>
        </div>
      </SpotlightCard>
    </div>
  );
}
