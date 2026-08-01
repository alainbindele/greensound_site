import React, { useEffect } from "react";
import { useLanguage } from "@/components/AppContext";
import { useAuth } from "@/lib/AuthContext";
import { isAdmin } from "@/lib/admin";
import { createPageUrl } from "@/utils";
import { AdminLoginRequired } from "@/components/admin/AdminAuthScreens";
import { SkeletonGrid } from "@/components/kit";

/**
 * Dedicated sign-in page.
 *
 * The admin panels each render this same form when they are reached without a
 * session; this page exists so there is a URL to *link* to — the footer entry
 * point — rather than expecting people to remember /AdminEvents.
 */
const ADMIN_HOME = createPageUrl("AdminEvents");

export default function Login() {
  const { language } = useLanguage();
  const { user, isLoadingAuth } = useAuth();

  const copy = {
    it: {
      message: "Accedi per gestire i contenuti del sito.",
      button: "Accedi",
      checking: "Verifica sessione",
    },
    en: {
      message: "Sign in to manage the site content.",
      button: "Sign in",
      checking: "Checking session",
    },
  }[language];

  // Already signed in? There is nothing to do here.
  useEffect(() => {
    if (!isLoadingAuth && isAdmin(user)) {
      window.location.replace(ADMIN_HOME);
    }
  }, [isLoadingAuth, user]);

  if (isLoadingAuth || isAdmin(user)) {
    return (
      <div className="shell py-32">
        <SkeletonGrid count={1} media={false} label={copy.checking} />
      </div>
    );
  }

  return (
    <AdminLoginRequired
      message={copy.message}
      buttonLabel={copy.button}
      language={language}
      redirectTo={ADMIN_HOME}
    />
  );
}
