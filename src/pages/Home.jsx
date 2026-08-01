import React from "react";
import { useLanguage, useTheme } from "@/components/AppContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, useReducedMotion } from "framer-motion";
import {
  Leaf,
  Music,
  Zap,
  Users,
  Lightbulb,
  ArrowRight,
  Github,
  ExternalLink,
  Play,
  Pause,
  Radio,
  Cpu,
  AudioWaveform,
  ChevronDown,
} from "lucide-react";
import BioSignalCanvas from "@/components/visuals/BioSignalCanvas";
import usePlantSynth from "@/components/visuals/usePlantSynth";
import { Reveal, Stagger, StaggerItem, Parallax } from "@/components/motion/Reveal";
import { SpotlightCard, Chip } from "@/components/kit";

const GITHUB_URL = "https://github.com/alainbindele/greensound";
const LOGO_URL =
  "/greensound-logo.jpg";

export default function Home() {
  const { language } = useLanguage();
  const { isDarkMode } = useTheme();
  const reduceMotion = useReducedMotion();
  const { isPlaying, toggle, analyser, supported } = usePlantSynth();

  const content = {
    it: {
      hero: {
        badge: "Progetto bio-musicale open source",
        title: "Greensound",
        project: "PROJECT",
        subtitle: "Dove la Natura Incontra la Musica",
        description: "Suoniamo le piante!",
        cta: "Senti la Musica",
        listen: "Ascolta la pianta",
        mute: "Silenzia",
        live: "Segnale dal vivo",
        hint: "Muovi il cursore sul segnale per eccitarlo",
        audioNote: "Audio generato nel browser, nessun file da scaricare",
        scroll: "Scorri",
      },
      chain: {
        eyebrow: "Come funziona",
        title: "Dalla foglia all'altoparlante",
        description:
          "Tre passaggi separano una pianta dal suono che senti. Nessuno di questi è una registrazione.",
        steps: [
          {
            icon: Leaf,
            tag: "Natura",
            title: "Bio-segnale",
            description:
              "Due elettrodi appoggiati sulle foglie leggono le micro-variazioni di conduttanza della pianta, che cambiano con luce, acqua e contatto.",
          },
          {
            icon: Cpu,
            tag: "Tecnologia",
            title: "Traduzione",
            description:
              "Un microcontrollore campiona il segnale e lo mappa su scale, tempi e timbri: la fisiologia diventa una partitura in tempo reale.",
          },
          {
            icon: AudioWaveform,
            tag: "Musica",
            title: "Suono vivo",
            description:
              "Il sintetizzatore esegue quella partitura mentre viene scritta. Ogni pianta, ogni giornata, un brano diverso.",
          },
        ],
      },
      features: [
        {
          icon: Leaf,
          title: "Natura Digitale",
          description:
            "Sensori avanzati captano l'energia elettrica delle piante e la trasformano in dati musicali",
        },
        {
          icon: Music,
          title: "Musica Viva",
          description:
            "Ogni pianta genera melodie uniche che cambiano in tempo reale con il suo stato",
        },
        {
          icon: Zap,
          title: "Tecnologia Bio",
          description:
            "L'innovazione al servizio della connessione tra uomo e natura",
        },
      ],
      featuresEyebrow: "Cosa rende Greensound diverso",
      manifesto: {
        eyebrow: "Manifesto",
        items: [
          "Nessuna traccia registrata",
          "Hardware documentato",
          "Codice aperto",
          "Installazioni riproducibili",
        ],
      },
      mission: {
        title: "La Nostra Missione",
        description:
          "GreenSound è più di un progetto tecnologico: è un invito a riscoprire il legame profondo tra uomo e natura. Attraverso installazioni, performance e ricerca, esploriamo nuove forme di espressione artistica che rivelano la musica nascosta nel mondo vegetale.",
      },
      team: {
        title: "Il Team",
        description:
          "Un collettivo di artisti, sviluppatori e ricercatori uniti dalla passione per l'innovazione sostenibile",
        cta: "Scopri il Team",
      },
      opensource: {
        title: "Open Source",
        description:
          "Crediamo nella condivisione della conoscenza. Il progetto è completamente open source e disponibile su GitHub.",
      },
    },
    en: {
      hero: {
        badge: "Open source bio-musical project",
        title: "Greensound",
        project: "PROJECT",
        subtitle: "Where Nature Meets Music",
        description: "We play plants!",
        cta: "Hear the Music",
        listen: "Listen to the plant",
        mute: "Mute",
        live: "Live signal",
        hint: "Move your cursor across the signal to excite it",
        audioNote: "Audio generated in your browser — nothing to download",
        scroll: "Scroll",
      },
      chain: {
        eyebrow: "How it works",
        title: "From leaf to loudspeaker",
        description:
          "Three steps separate a plant from the sound you hear. None of them is a recording.",
        steps: [
          {
            icon: Leaf,
            tag: "Nature",
            title: "Bio-signal",
            description:
              "Two electrodes resting on the leaves read the plant's micro-variations in conductance, which shift with light, water and touch.",
          },
          {
            icon: Cpu,
            tag: "Technology",
            title: "Translation",
            description:
              "A microcontroller samples the signal and maps it onto scales, tempo and timbre: physiology becomes a score written in real time.",
          },
          {
            icon: AudioWaveform,
            tag: "Music",
            title: "Living sound",
            description:
              "The synthesiser performs that score as it is being written. Every plant, every day, a different piece.",
          },
        ],
      },
      features: [
        {
          icon: Leaf,
          title: "Digital Nature",
          description:
            "Advanced sensors capture plants' electrical energy and transform it into musical data",
        },
        {
          icon: Music,
          title: "Living Music",
          description:
            "Each plant generates unique melodies that change in real-time with its state",
        },
        {
          icon: Zap,
          title: "Bio Technology",
          description:
            "Innovation serving the connection between humans and nature",
        },
      ],
      featuresEyebrow: "What makes Greensound different",
      manifesto: {
        eyebrow: "Manifesto",
        items: [
          "No recorded tracks",
          "Documented hardware",
          "Open code",
          "Reproducible installations",
        ],
      },
      mission: {
        title: "Our Mission",
        description:
          "GreenSound is more than a technological project: it's an invitation to rediscover the deep connection between humans and nature. Through installations, performances and research, we explore new forms of artistic expression that reveal the hidden music in the plant world.",
      },
      team: {
        title: "The Team",
        description:
          "A collective of artists, developers and researchers united by passion for sustainable innovation",
        cta: "Meet the Team",
      },
      opensource: {
        title: "Open Source",
        description:
          "We believe in knowledge sharing. The project is completely open source and available on GitHub.",
      },
    },
  };

  const c = content[language];

  return (
    <div>
      {/* ==================================================================
          Hero — the instrument
          ================================================================== */}
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
        <div className="aurora-field grain" aria-hidden="true" />

        {/* The living signal. Sits behind the copy, never on top of it. */}
        <BioSignalCanvas
          analyser={analyser}
          isDarkMode={isDarkMode}
          // Dialled back on small screens, where the trace would otherwise
          // run straight through the headline.
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[60vh] w-full -translate-y-1/2 opacity-45 md:opacity-80"
        />

        <div className="shell relative z-10 py-28 text-center">
          <Reveal>
            <Chip tone="brand" className="mb-8">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              {c.hero.badge}
            </Chip>
          </Reveal>

          <Reveal delay={0.05}>
            <span className="pulse-ring relative mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full md:h-36 md:w-36">
              <img
                src={LOGO_URL}
                alt="Greensound Project"
                width="144"
                height="144"
                className="h-28 w-28 rounded-full object-cover ring-4 ring-brand/50 md:h-36 md:w-36"
              />
            </span>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-gradient-bio text-[clamp(3rem,11vw,7rem)] font-black leading-none tracking-tight">
              {c.hero.title}
            </h1>
            <p className="mt-3 font-mono text-sm tracking-[0.5em] text-brand/80 md:text-base">
              {c.hero.project}
            </p>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mx-auto mt-8 max-w-3xl text-2xl font-light md:text-4xl">
              {c.hero.subtitle}
            </p>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">
              {c.hero.description}
            </p>
          </Reveal>

          {/* Primary actions */}
          <Reveal delay={0.22}>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {supported && (
                <Button
                  onClick={toggle}
                  aria-pressed={isPlaying}
                  size="lg"
                  className="group h-14 rounded-full bg-brand-solid px-8 text-base font-semibold text-primary-foreground shadow-glow transition-transform hover:bg-brand-solid/90 hover:scale-[1.03] active:scale-100"
                >
                  {isPlaying ? (
                    <Pause className="mr-2.5 h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Play className="mr-2.5 h-5 w-5" aria-hidden="true" />
                  )}
                  {isPlaying ? c.hero.mute : c.hero.listen}
                  {isPlaying && (
                    <span className="ml-3 flex h-4 items-end gap-0.5" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="w-0.5 origin-bottom rounded-full bg-primary-foreground animate-equalize"
                          style={{ height: "100%", animationDelay: `${i * 0.13}s` }}
                        />
                      ))}
                    </span>
                  )}
                </Button>
              )}

              <Link to={createPageUrl("About")}>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-full border-brand/50 px-8 text-base font-semibold text-brand hover:bg-brand/10 hover:text-brand"
                >
                  {c.hero.cta}
                  <ArrowRight className="ml-2.5 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              {isPlaying ? (
                <span className="inline-flex items-center gap-2 text-brand">
                  <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                  {c.hero.live}
                </span>
              ) : (
                c.hero.audioNote
              )}
            </p>
            <p className="mt-2 hidden text-xs text-muted-foreground md:block">
              {c.hero.hint}
            </p>
          </Reveal>
        </div>

        {/* Scroll cue */}
        {!reduceMotion && (
          <motion.div
            aria-hidden="true"
            className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-muted-foreground"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="flex flex-col items-center gap-1.5">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em]">
                {c.hero.scroll}
              </span>
              <ChevronDown className="h-4 w-4" />
            </span>
          </motion.div>
        )}
      </section>

      {/* ==================================================================
          Signal chain — nature → technology → music
          ================================================================== */}
      <section className="section relative">
        <div className="shell">
          <Reveal className="mx-auto mb-16 max-w-2xl text-center">
            <p className="eyebrow mb-3">{c.chain.eyebrow}</p>
            <h2 className="text-3xl font-bold md:text-5xl">{c.chain.title}</h2>
            <p className="mt-5 text-lg text-muted-foreground">
              {c.chain.description}
            </p>
          </Reveal>

          <Stagger className="grid gap-6 md:grid-cols-3 md:gap-4">
            {c.chain.steps.map((step, index) => (
              <StaggerItem key={step.title} className="relative">
                {/* Connector carrying a travelling pulse to the next node. */}
                {index < c.chain.steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-2 top-14 hidden h-px w-4 md:block"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-brand/60 to-transparent" />
                    <span className="absolute -top-[3px] h-[7px] w-[7px] animate-travel rounded-full bg-signal-music shadow-[0_0_10px_2px_hsl(var(--signal-music)/0.6)]" />
                  </span>
                )}

                <SpotlightCard className="h-full">
                  <div className="p-8">
                    <div className="mb-6 flex items-center justify-between">
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 ring-1 ring-inset ring-brand/25">
                        <step.icon className="h-7 w-7 text-brand" aria-hidden="true" />
                      </span>
                      <span className="font-mono text-4xl font-bold text-brand/15">
                        0{index + 1}
                      </span>
                    </div>
                    <p className="eyebrow mb-2">{step.tag}</p>
                    <h3 className="mb-3 text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </SpotlightCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ==================================================================
          Manifesto strip
          ================================================================== */}
      <section className="relative overflow-hidden border-y border-border/70 bg-card/30 py-8">
        <div className="shell">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            <li className="eyebrow">{c.manifesto.eyebrow}</li>
            {c.manifesto.items.map((item) => (
              <li key={item} className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-solar"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ==================================================================
          Features
          ================================================================== */}
      <section className="section">
        <div className="shell">
          <Reveal className="mb-14 text-center">
            <p className="eyebrow mb-3">{c.featuresEyebrow}</p>
          </Reveal>

          <Stagger className="grid gap-8 md:grid-cols-3">
            {c.features.map((feature) => (
              <StaggerItem key={feature.title}>
                <SpotlightCard className="h-full">
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-signal-nature to-signal-tech shadow-e2">
                      <feature.icon
                        className="h-8 w-8 text-white"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-brand">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </SpotlightCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ==================================================================
          Mission
          ================================================================== */}
      <section className="section relative overflow-hidden">
        <div className="aurora-field" aria-hidden="true" />
        <Parallax speed={0.08} className="relative z-10">
          <div className="shell-narrow text-center">
            <Reveal>
              <h2 className="text-gradient-bio text-3xl font-bold md:text-5xl">
                {c.mission.title}
              </h2>
              <div className="hairline mx-auto my-8 w-40" aria-hidden="true" />
              <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                {c.mission.description}
              </p>
            </Reveal>
          </div>
        </Parallax>
      </section>

      {/* ==================================================================
          Team & Open Source
          ================================================================== */}
      <section className="section">
        <div className="shell">
          <Stagger className="grid gap-8 md:grid-cols-2">
            <StaggerItem>
              <SpotlightCard className="h-full">
                <div className="flex h-full flex-col p-10 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 ring-1 ring-inset ring-brand/25">
                    <Users className="h-8 w-8 text-brand" aria-hidden="true" />
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold">{c.team.title}</h3>
                  <p className="mb-8 text-muted-foreground">{c.team.description}</p>
                  <Link to={createPageUrl("About")} className="mt-auto">
                    <Button
                      variant="outline"
                      className="rounded-full border-brand/50 text-brand hover:bg-brand/10 hover:text-brand"
                    >
                      {c.team.cta}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Link>
                </div>
              </SpotlightCard>
            </StaggerItem>

            <StaggerItem>
              <SpotlightCard className="h-full">
                <div className="flex h-full flex-col p-10 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-solar/10 ring-1 ring-inset ring-solar/30">
                    <Lightbulb className="h-8 w-8 text-solar" aria-hidden="true" />
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold">
                    {c.opensource.title}
                  </h3>
                  <p className="mb-8 text-muted-foreground">
                    {c.opensource.description}
                  </p>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto"
                  >
                    <Button
                      variant="outline"
                      className="rounded-full border-brand/50 text-brand hover:bg-brand/10 hover:text-brand"
                    >
                      <Github className="mr-2 h-4 w-4" aria-hidden="true" />
                      GitHub
                      <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  </a>
                </div>
              </SpotlightCard>
            </StaggerItem>
          </Stagger>
        </div>
      </section>
    </div>
  );
}
