import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, FileText, Newspaper, BookOpen, Users } from "lucide-react";

/**
 * Cross-links between the admin sections.
 *
 * Without this each panel is an unlinked URL you have to know by heart; the
 * public nav deliberately does not expose them.
 */
const SECTIONS = [
  { page: "AdminEvents", icon: Calendar, it: "Eventi", en: "Events" },
  { page: "AdminArticles", icon: FileText, it: "Articoli", en: "Articles" },
  { page: "AdminNews", icon: Newspaper, it: "News", en: "News" },
  { page: "AdminDocumentation", icon: BookOpen, it: "Documentazione", en: "Documentation" },
  { page: "AdminCollaborators", icon: Users, it: "Team", en: "Team" },
];

export default function AdminNav({ language = "it" }) {
  const location = useLocation();

  return (
    <nav
      aria-label={language === "it" ? "Sezioni amministrazione" : "Admin sections"}
      className="mb-10"
    >
      <ul className="flex flex-wrap gap-2">
        {SECTIONS.map(({ page, icon: Icon, it, en }) => {
          const url = createPageUrl(page);
          const active = location.pathname === url;
          return (
            <li key={page}>
              <Link
                to={url}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-brand-solid text-primary-foreground shadow-e1"
                    : "border border-border text-muted-foreground hover:border-brand/50 hover:text-brand"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {language === "it" ? it : en}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
