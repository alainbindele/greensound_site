
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Moon, Sun, Menu, X, Github, Leaf, LogIn, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeContext, LanguageContext, translations } from "@/components/AppContext";
import { ScrollProgress } from "@/components/motion/Reveal";
import { useAuth } from "@/lib/AuthContext";
import { isAdmin } from "@/lib/admin";

const GITHUB_URL = "https://github.com/alainbindele/greensound";
const LOGO_URL =
  "/greensound-logo.jpg";

export default function Layout({ children, currentPageName }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { user, logout } = useAuth();
  const signedIn = isAdmin(user);

  const t = translations[language];

  // SEO content for each page
  const seoContent = {
    it: {
      Home: {
        title: "Greensound - Suoniamo le Piante | Progetto Bio-Musicale Open Source",
        description: "Greensound trasforma l'energia elettrica delle piante in musica dal vivo. Progetto innovativo che unisce natura, tecnologia e arte per creare esperienze musicali uniche.",
        keywords: "greensound, piante musica, bio-musica, tecnologia natura, installazioni interattive, open source, alain bindele, performance artistiche"
      },
      Events: {
        title: "Eventi Greensound - Performance e Installazioni Bio-Musicali",
        description: "Scopri i prossimi eventi, performance e installazioni di Greensound. Esperienze uniche dove le piante diventano strumenti musicali attraverso la bio-tecnologia.",
        keywords: "eventi greensound, performance bio-musicali, installazioni artistiche, concerti piante, workshop natura musica"
      },
      Articles: {
        title: "Articoli Greensound - Approfondimenti su Bio-Musica e Tecnologia",
        description: "Leggi gli ultimi articoli su Greensound: ricerca, sviluppi tecnologici, interviste e approfondimenti sul mondo della bio-musica e dell'arte interattiva.",
        keywords: "articoli greensound, bio-musica ricerca, tecnologia natura, arte interattiva, sviluppo sostenibile"
      },
      News: {
        title: "News Greensound - Ultime Novità del Progetto Bio-Musicale",
        description: "Resta aggiornato sulle ultime novità di Greensound: nuovi sviluppi, collaborazioni, riconoscimenti e aggiornamenti del progetto bio-musicale.",
        keywords: "news greensound, novità progetto, aggiornamenti bio-musica, collaborazioni artistiche"
      },
      Documentation: {
        title: "Documentazione Greensound - Guide Tecniche e Risorse Open Source",
        description: "Accedi alla documentazione tecnica completa di Greensound: guide hardware, software, API e risorse per sviluppatori. Progetto completamente open source.",
        keywords: "documentazione greensound, guide tecniche, open source, hardware bio-musicale, API sviluppatori, tutorial"
      },
      About: {
        title: "Chi Siamo - Il Team Greensound e la Nostra Missione",
        description: "Scopri il team dietro Greensound e la nostra missione: creare ponti tra natura e tecnologia attraverso l'arte e la musica. Progetto guidato da Alain Bindele.",
        keywords: "team greensound, alain bindele, missione progetto, bio-tecnologia, arte natura, sviluppatori"
      }
    },
    en: {
      Home: {
        title: "Greensound - We Play Plants | Open Source Bio-Musical Project",
        description: "Greensound transforms plants' electrical energy into live music. Innovative project connecting nature, technology and art to create unique musical experiences.",
        keywords: "greensound, plant music, bio-music, nature technology, interactive installations, open source, alain bindele, artistic performances"
      },
      Events: {
        title: "Greensound Events - Bio-Musical Performances and Installations",
        description: "Discover upcoming Greensound events, performances and installations. Unique experiences where plants become musical instruments through bio-technology.",
        keywords: "greensound events, bio-musical performances, artistic installations, plant concerts, nature music workshops"
      },
      Articles: {
        title: "Greensound Articles - Insights on Bio-Music and Technology",
        description: "Read the latest Greensound articles: research, technological developments, interviews and insights into bio-music and interactive art.",
        keywords: "greensound articles, bio-music research, nature technology, interactive art, sustainable development"
      },
      News: {
        title: "Greensound News - Latest Updates from Bio-Musical Project",
        description: "Stay updated on the latest Greensound news: new developments, collaborations, recognition and bio-musical project updates.",
        keywords: "greensound news, project updates, bio-music developments, artistic collaborations"
      },
      Documentation: {
        title: "Greensound Documentation - Technical Guides and Open Source Resources",
        description: "Access complete Greensound technical documentation: hardware guides, software, APIs and developer resources. Fully open source project.",
        keywords: "greensound documentation, technical guides, open source, bio-musical hardware, developer APIs, tutorials"
      },
      About: {
        title: "About Us - Greensound Team and Our Mission",
        description: "Discover the team behind Greensound and our mission: creating bridges between nature and technology through art and music. Project led by Alain Bindele.",
        keywords: "greensound team, alain bindele, project mission, bio-technology, nature art, developers"
      }
    }
  };

  useEffect(() => {
    // Language Detection: 1. localStorage, 2. Browser, 3. Default
    const savedLang = localStorage.getItem('greensound-language');
    if (savedLang) {
      setLanguage(savedLang);
    } else {
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang.startsWith('it')) {
        setLanguage('it');
      } else {
        setLanguage('en');
      }
    }

    // Theme Detection: 1. localStorage, 2. OS preference, 3. Time of day
    const savedTheme = localStorage.getItem('greensound-theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').media !== 'not all') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const currentHour = new Date().getHours();
      setIsDarkMode(prefersDark || currentHour < 6 || currentHour >= 18);
    }
  }, []);

  // Persist theme changes to localStorage and update DOM
  useEffect(() => {
    localStorage.setItem('greensound-theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Persist language changes to localStorage
  useEffect(() => {
    localStorage.setItem('greensound-language', language);
  }, [language]);

  // Swap the nav from transparent to glass once the page has moved.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile sheet on navigation, on Escape, and lock body scroll
  // while it is open.
  useEffect(() => setIsMobileMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isMobileMenuOpen]);

  // Update document head with SEO data
  useEffect(() => {
    // Get current page SEO data
    const getCurrentPageSEO = () => {
      const pageName = currentPageName || 'Home';
      const currentSEO = seoContent[language][pageName];
      if (!currentSEO) {
        return seoContent[language].Home; // fallback
      }
      return currentSEO;
    };

    const seo = getCurrentPageSEO();

    // Update title
    document.title = seo.title;

    // Update or create meta tags
    const updateMetaTag = (name, content, property = null) => {
      const selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector);
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Basic SEO meta tags
    updateMetaTag('description', seo.description);
    updateMetaTag('keywords', seo.keywords);
    updateMetaTag('author', 'Alain Bindele');
    updateMetaTag('robots', 'index, follow');

    // Language and locale
    updateMetaTag('language', language);
    document.documentElement.lang = language;

    // Open Graph tags
    updateMetaTag('', seo.title, 'og:title');
    updateMetaTag('', seo.description, 'og:description');
    updateMetaTag('', 'website', 'og:type');
    updateMetaTag('', 'https://greensoundproject.com', 'og:url');
    updateMetaTag('', LOGO_URL, 'og:image');
    updateMetaTag('', 'Greensound', 'og:site_name');
    updateMetaTag('', language === 'it' ? 'it_IT' : 'en_US', 'og:locale');

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', seo.title);
    updateMetaTag('twitter:description', seo.description);
    updateMetaTag('twitter:image', LOGO_URL);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://greensoundproject.com${location.pathname}`);

  }, [language, currentPageName, location.pathname]);

  // Add viewport meta tag and structured data on mount (or language change)
  useEffect(() => {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, shrink-to-fit=no');
      document.head.appendChild(viewport);
    }

    // Add structured data for organization
    let structuredData = document.querySelector('#structured-data');
    if (!structuredData) {
      structuredData = document.createElement('script');
      structuredData.setAttribute('type', 'application/ld+json');
      structuredData.setAttribute('id', 'structured-data');
      document.head.appendChild(structuredData); // Append once, then update content
    }
    const organizationData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Greensound",
      "description": language === 'it'
        ? "Progetto bio-musicale che trasforma l'energia delle piante in musica"
        : "Bio-musical project that transforms plant energy into music",
      "url": "https://greensoundproject.com",
      "logo": LOGO_URL,
      "founder": {
        "@type": "Person",
        "name": "Alain Bindele"
      },
      "sameAs": [GITHUB_URL]
    };
    structuredData.textContent = JSON.stringify(organizationData);
  }, [language]); // Depend on language so description updates

  const toggleTheme = () => setIsDarkMode((value) => !value);

  const navigationItems = [
    { name: t.home, url: createPageUrl("Home") },
    { name: t.events, url: createPageUrl("Events") },
    { name: t.articles, url: createPageUrl("Articles") },
    { name: t.news, url: createPageUrl("News") },
    { name: t.documentation, url: createPageUrl("Documentation") },
    { name: t.about, url: createPageUrl("About") }
  ];

  const isActive = (url) => location.pathname === url;

  const LanguageToggle = ({ size = "sm" }) => (
    <div
      role="group"
      aria-label={t.changeLanguage}
      className={`flex items-center rounded-full border border-border bg-background/60 p-0.5 ${
        size === "lg" ? "text-base" : "text-xs"
      }`}
    >
      {['it', 'en'].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          aria-pressed={language === code}
          className={`relative rounded-full px-3 py-1.5 font-semibold uppercase tracking-wider transition-colors ${
            language === code
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {language === code && (
            <motion.span
              layoutId={`lang-pill-${size}`}
              className="absolute inset-0 rounded-full bg-brand-solid"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <span className="relative">{code}</span>
        </button>
      ))}
    </div>
  );

  const ThemeToggle = () => (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDarkMode}
      aria-label={t.changeTheme}
      title={t.changeTheme}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 text-foreground transition-colors hover:border-brand/50 hover:text-brand"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDarkMode ? 'moon' : 'sun'}
          initial={reduceMotion ? false : { opacity: 0, rotate: -70, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, rotate: 70, scale: 0.6 }}
          transition={{ duration: 0.22 }}
          className="absolute"
        >
          {isDarkMode ? (
            <Moon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Sun className="h-5 w-5" aria-hidden="true" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );

  const handleLogout = async () => {
    await logout();
    // Back to the public site rather than sitting on a page that is now
    // showing a sign-in form.
    window.location.assign(createPageUrl('Home'));
  };

  /**
   * Admin entry point. Only rendered once a session exists — the public nav
   * never advertises it; the discreet footer link is the way in.
   */
  const AdminControls = ({ stacked = false }) => {
    if (!signedIn) return null;
    return (
      <div className={`flex items-center gap-2 ${stacked ? 'w-full' : ''}`}>
        <Link
          to={createPageUrl('AdminEvents')}
          className={`flex min-h-[40px] items-center gap-2 rounded-full bg-brand/10 px-4 text-sm font-semibold text-brand ring-1 ring-inset ring-brand/25 transition-colors hover:bg-brand/20 ${
            stacked ? 'flex-1 justify-center' : ''
          }`}
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          Admin
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          aria-label={language === 'it' ? 'Esci' : 'Sign out'}
          title={language === 'it' ? 'Esci' : 'Sign out'}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
          {/* Page-wide ambient wash: one fixed layer instead of a gradient on
              every section. */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              background:
                'radial-gradient(120% 80% at 15% -10%, hsl(var(--signal-nature) / 0.14), transparent 55%), radial-gradient(90% 70% at 95% 10%, hsl(var(--signal-tech) / 0.12), transparent 55%), radial-gradient(120% 90% at 50% 110%, hsl(var(--brand-solid) / 0.1), transparent 60%)',
            }}
          />

          <a href="#main" className="skip-link">
            {language === 'it' ? 'Vai al contenuto' : 'Skip to content'}
          </a>

          {/* Navigation */}
          <nav
            className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
              isScrolled || isMobileMenuOpen
                ? 'glass border-b border-border/70 shadow-e2'
                : 'border-b border-transparent bg-transparent'
            }`}
          >
            <ScrollProgress className="absolute inset-x-0 top-0 h-0.5" />
            <div className="shell">
              <div className="flex h-16 items-center justify-between">
                {/* Logo */}
                <Link
                  to={createPageUrl("Home")}
                  className="group flex items-center gap-3"
                  aria-label="Greensound Project — home"
                >
                  <span className="pulse-ring relative flex h-9 w-9 items-center justify-center rounded-full">
                    <img
                      src={LOGO_URL}
                      alt=""
                      width="36"
                      height="36"
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-brand/40"
                    />
                  </span>
                  <span className="flex flex-col leading-none">
                    <span className="font-display text-lg font-bold text-gradient-bio">
                      Greensound
                    </span>
                    <span className="font-mono text-[0.55rem] tracking-[0.42em] text-brand/80">
                      PROJECT
                    </span>
                  </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden items-center gap-1 lg:flex">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.url}
                      aria-current={isActive(item.url) ? 'page' : undefined}
                      className={`relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                        isActive(item.url)
                          ? 'text-brand'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isActive(item.url) && (
                        <motion.span
                          layoutId="nav-active-pill"
                          className="absolute inset-0 rounded-full bg-brand/10 ring-1 ring-inset ring-brand/25"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span className="relative">{item.name}</span>
                    </Link>
                  ))}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <div className="hidden items-center gap-3 lg:flex">
                    <AdminControls />
                    <LanguageToggle />
                    <ThemeToggle />
                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="GitHub repository (opens in a new tab)"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 text-foreground transition-colors hover:border-brand/50 hover:text-brand"
                    >
                      <Github className="h-5 w-5" aria-hidden="true" />
                    </a>
                  </div>

                  {/* Mobile Menu Button — 44px target */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 lg:hidden"
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="mobile-menu"
                    aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                    onClick={() => setIsMobileMenuOpen((open) => !open)}
                  >
                    {isMobileMenuOpen ? (
                      <X className="h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Menu className="h-6 w-6" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  id="mobile-menu"
                  initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  // Opaque, not glass: at 60% the hero logo bled through the
                  // panel as a grey smudge.
                  className="overflow-hidden border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
                >
                  <div className="shell space-y-1 py-4">
                    {navigationItems.map((item, index) => (
                      <motion.div
                        key={item.name}
                        initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: reduceMotion ? 0 : 0.04 * index }}
                      >
                        <Link
                          to={item.url}
                          aria-current={isActive(item.url) ? 'page' : undefined}
                          className={`flex min-h-[44px] items-center rounded-lg px-4 text-base font-medium transition-colors ${
                            isActive(item.url)
                              ? 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/25'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          {item.name}
                        </Link>
                      </motion.div>
                    ))}

                    {signedIn && (
                      <div className="border-t border-border pt-4">
                        <AdminControls stacked />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                      <LanguageToggle size="lg" />
                      <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <a
                          href={GITHUB_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="GitHub repository (opens in a new tab)"
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-brand/50 hover:text-brand"
                        >
                          <Github className="h-5 w-5" aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>

          {/* Main Content */}
          <main id="main" className="relative z-10">
            {children}
          </main>

          {/* Footer */}
          <footer className="relative z-10 mt-24 border-t border-border/70 bg-card/40">
            {/* Equalizer motif: the signal running off the bottom of the page. */}
            <div
              aria-hidden="true"
              className="flex h-10 items-end justify-center gap-1 overflow-hidden px-4"
            >
              {Array.from({ length: 48 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1 origin-bottom rounded-t-full bg-gradient-to-t from-brand/50 to-signal-music/50 animate-equalize"
                  style={{
                    height: `${18 + ((i * 37) % 22)}px`,
                    animationDelay: `${(i % 12) * 0.09}s`,
                  }}
                />
              ))}
            </div>

            <div className="shell py-14">
              <div className="grid gap-10 md:grid-cols-3">
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <img
                      src={LOGO_URL}
                      alt=""
                      width="32"
                      height="32"
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-brand/40"
                    />
                    <span className="font-display text-lg font-bold">Greensound</span>
                  </div>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    {language === 'it'
                      ? 'Unendo natura, musica e tecnologia per un futuro sostenibile.'
                      : 'Connecting nature, music and technology for a sustainable future.'}
                  </p>
                </div>

                <nav aria-label={language === 'it' ? 'Navigazione footer' : 'Footer navigation'}>
                  <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-brand">
                    {language === 'it' ? 'Esplora' : 'Explore'}
                  </h2>
                  <ul className="grid grid-cols-2 gap-y-2 text-sm">
                    {navigationItems.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.url}
                          className="text-muted-foreground transition-colors hover:text-brand"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div>
                  <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-brand">
                    {language === 'it' ? 'Progetto' : 'Project'}
                  </h2>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-brand/50 hover:text-brand"
                  >
                    <Github className="h-4 w-4" aria-hidden="true" />
                    {t.opensource}
                  </a>
                  <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Leaf className="h-4 w-4 text-brand" aria-hidden="true" />
                    {language === 'it'
                      ? 'Codice, hardware e documentazione aperti.'
                      : 'Open code, hardware and documentation.'}
                  </p>
                </div>
              </div>

              <div className="hairline my-10" aria-hidden="true" />

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()} Greensound — Alain Bindele
                </p>

                {/* The way in to the CMS. Deliberately quiet: the site is
                    protected by the password and the login rate-limit, not by
                    hiding this link, but it does not need to shout either. */}
                {signedIn ? (
                  <Link
                    to={createPageUrl('AdminEvents')}
                    className="inline-flex items-center gap-2 text-xs text-brand transition-colors hover:text-foreground"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                    {language === 'it' ? 'Gestisci contenuti' : 'Manage content'}
                  </Link>
                ) : (
                  <Link
                    to={createPageUrl('Login')}
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-brand"
                  >
                    <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                    {language === 'it' ? 'Area riservata' : 'Admin area'}
                  </Link>
                )}
              </div>
            </div>
          </footer>
        </div>
      </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
}
