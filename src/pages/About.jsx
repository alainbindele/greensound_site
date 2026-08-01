
import React, { useState, useEffect } from "react";
import { Collaborator } from "@/api/entities";
import { useLanguage } from "@/components/AppContext";
import { Button } from "@/components/ui/button";
import {
  User as UserIcon,
  ExternalLink,
  Instagram,
  Globe,
  Music,
  Code,
  Palette,
  Github,
  Linkedin,
  Twitter,
  Users,
} from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { PageHero, SpotlightCard, SkeletonGrid, Chip } from "@/components/kit";

const GITHUB_URL = "https://github.com/alainbindele/greensound";

export default function About() {
  const { language } = useLanguage();
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);

  const content = {
    it: {
      eyebrow: "Il progetto e le persone",
      title: "Chi Siamo",
      subtitle: "Il team dietro Greensound",
      project: {
        title: "Il Progetto",
        description: "Greensound nasce dall'idea di creare un ponte tra il mondo naturale e quello tecnologico, trasformando l'energia elettrica delle piante in musica. Attraverso sensori avanzati, catturiamo le variazioni elettriche delle piante e le convertiamo in suoni e melodie che cambiano in tempo reale, offrendo un'esperienza unica di connessione con la natura."
      },
      vision: {
        title: "La Nostra Visione",
        description: "Crediamo che la tecnologia possa essere un mezzo per riavvicinare l'uomo alla natura, non per allontanarlo. Greensound esplora nuove forme di arte interattiva, ricerca scientifica e sensibilizzazione ambientale, creando spazi dove l'ascolto diventa scoperta e la natura si fa sentire in modi inaspettati."
      },
      team: {
        title: "TEAM",
        description: "Artisti, sviluppatori e ricercatori dietro le installazioni.",
        loading: "Caricamento del team",
      },
      opensource: {
        title: "Open Source",
        description: "Greensound è un progetto completamente open source. Crediamo nella condivisione della conoscenza e nell'importanza della collaborazione per innovare. Tutto il codice, la documentazione e i progetti hardware sono disponibili liberamente su GitHub.",
        cta: "Visita Repository",
      }
    },
    en: {
      eyebrow: "The project and the people",
      title: "About Us",
      subtitle: "The team behind Greensound",
      project: {
        title: "The Project",
        description: "Greensound was born from the idea of creating a bridge between the natural and technological world, transforming plants' electrical energy into music. Through advanced sensors, we capture plants' electrical variations and convert them into sounds and melodies that change in real-time, offering a unique experience of connection with nature."
      },
      vision: {
        title: "Our Vision",
        description: "We believe that technology can be a means to bring humans closer to nature, not to distance them. GreenSound explores new forms of interactive art, scientific research and environmental awareness, creating spaces where listening becomes discovery and nature makes itself heard in unexpected ways."
      },
      team: {
        title: "TEAM",
        description: "The artists, developers and researchers behind the installations.",
        loading: "Loading the team",
      },
      opensource: {
        title: "Open Source",
        description: "GreenSound is a completely open source project. We believe in knowledge sharing and the importance of collaboration for innovation. All code, documentation and hardware projects are freely available on GitHub.",
        cta: "Visit Repository",
      }
    }
  };

  const currentContent = content[language];

  useEffect(() => {
    const loadCollaborators = async () => {
      setLoading(true);
      try {
        const data = await Collaborator.filter({ is_active: true }, 'order');
        setCollaborators(data);
      } catch (error) {
        console.error('Error loading collaborators:', error);
        setCollaborators([]);
      } finally {
        setLoading(false);
      }
    };

    loadCollaborators();
  }, []); // Empty dependency array ensures this runs only ONCE.

  const creator = collaborators.find(c => c.is_creator);
  const teamMembers = collaborators.filter(c => !c.is_creator);

  const getRoleIcon = (role) => {
    if (!role) return UserIcon;
    if (role.includes('Developer') || role.includes('Sviluppatore') || role.includes('Creatore')) return Code;
    if (role.includes('Sound') || role.includes('Performer') || role.includes('Audio')) return Music;
    if (role.includes('Visual') || role.includes('Artist') || role.includes('Editor') || role.includes('Artista') || role.includes('Poet')) return Palette;
    return UserIcon;
  };

  const getSocialIcon = (platform) => {
    if (platform === 'instagram') return Instagram;
    if (platform === 'linkedin') return Linkedin;
    if (platform === 'twitter') return Twitter;
    if (platform === 'website') return Globe;
    // Default to ExternalLink for anything else or unknown
    return ExternalLink;
  };

  const socialLinksFor = (person) =>
    [
      { url: person.website ? `https://${person.website}` : null, label: person.website, kind: 'website' },
      { url: person.instagram, label: 'Instagram', kind: 'instagram' },
      { url: person.linkedin, label: 'LinkedIn', kind: 'linkedin' },
      { url: person.twitter, label: 'Twitter', kind: 'twitter' }
    ].filter(link => link.url);

  const SocialRow = ({ person, align = 'center' }) => {
    const links = socialLinksFor(person);
    if (links.length === 0) return null;
    return (
      <ul className={`flex flex-wrap gap-x-5 gap-y-2 ${align === 'center' ? 'justify-center' : ''}`}>
        {links.map((link) => {
          const Icon = getSocialIcon(link.kind);
          return (
            <li key={link.kind}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-brand transition-colors hover:text-foreground"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{link.label}</span>
                <span className="sr-only">
                  {language === 'it' ? '(si apre in una nuova scheda)' : '(opens in a new tab)'}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow={currentContent.eyebrow}
        icon={Users}
        title={currentContent.title}
        subtitle={currentContent.subtitle}
      />

      <div className="shell pb-24">
        {/* Project & Vision */}
        <Stagger className="mb-24 grid gap-8 md:grid-cols-2">
          {[currentContent.project, currentContent.vision].map((block) => (
            <StaggerItem key={block.title}>
              <SpotlightCard className="h-full">
                <div className="p-8 md:p-10">
                  <h2 className="mb-4 text-2xl font-semibold text-brand">
                    {block.title}
                  </h2>
                  <p className="leading-relaxed text-muted-foreground">
                    {block.description}
                  </p>
                </div>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Team */}
        <section className="mb-24">
          {loading ? (
            <SkeletonGrid count={3} media={false} label={currentContent.team.loading} />
          ) : (creator || teamMembers.length > 0) ? (
            <>
              <Reveal className="mb-12 text-center">
                <h2 className="text-gradient-bio text-3xl font-bold md:text-4xl">
                  {currentContent.team.title}
                </h2>
                <p className="mt-3 text-muted-foreground">
                  {currentContent.team.description}
                </p>
                <div className="hairline mx-auto mt-8 w-40" aria-hidden="true" />
              </Reveal>

              {creator && (
                <Reveal className="mb-12">
                  <SpotlightCard as="article" className="mx-auto max-w-4xl">
                    <div className="flex flex-col items-center gap-8 p-8 md:flex-row md:p-10">
                      {creator.image_url && (
                        <img
                          src={creator.image_url}
                          alt={creator.name}
                          width="160"
                          height="160"
                          loading="lazy"
                          className="h-40 w-40 shrink-0 rounded-full object-cover ring-4 ring-brand/40"
                        />
                      )}
                      <div className="flex-1 text-center md:text-left">
                        <Chip tone="solar" className="mb-3">
                          {language === 'it' ? 'Fondatore' : 'Founder'}
                        </Chip>
                        <h3 className="mb-1 text-3xl font-semibold">{creator.name}</h3>
                        <p className="mb-4 text-xl font-semibold text-brand">
                          {language === 'it' ? creator.role_it : creator.role_en}
                        </p>
                        <p className="mb-6 leading-relaxed text-muted-foreground">
                          {language === 'it' ? creator.description_it : creator.description_en}
                        </p>
                        <div className="flex justify-center md:justify-start">
                          <SocialRow person={creator} align="start" />
                        </div>
                      </div>
                    </div>
                  </SpotlightCard>
                </Reveal>
              )}

              {teamMembers.length > 0 && (
                <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {teamMembers.map((collaborator) => {
                    const RoleIcon = getRoleIcon(
                      language === 'it' ? collaborator.role_it : collaborator.role_en
                    );

                    return (
                      <StaggerItem key={collaborator.id}>
                        <SpotlightCard as="article" className="h-full">
                          <div className="flex h-full flex-col p-6 text-center">
                            {collaborator.image_url ? (
                              <img
                                src={collaborator.image_url}
                                alt={collaborator.name}
                                width="96"
                                height="96"
                                loading="lazy"
                                className="mx-auto mb-4 h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-brand/30"
                              />
                            ) : (
                              <span className="mx-auto mb-4 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-signal-nature to-signal-tech">
                                <RoleIcon className="h-11 w-11 text-white" aria-hidden="true" />
                              </span>
                            )}
                            <h3 className="mb-1 text-lg font-semibold">
                              {collaborator.name}
                            </h3>
                            <p className="mb-3 text-sm font-medium text-brand">
                              {language === 'it' ? collaborator.role_it : collaborator.role_en}
                            </p>
                            <p className="mb-4 text-sm text-muted-foreground">
                              {language === 'it'
                                ? collaborator.description_it
                                : collaborator.description_en}
                            </p>
                            <div className="mt-auto">
                              <SocialRow person={collaborator} />
                            </div>
                          </div>
                        </SpotlightCard>
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              )}
            </>
          ) : null}
        </section>

        {/* Open Source */}
        <Reveal>
          <SpotlightCard interactive={false} className="mx-auto max-w-3xl">
            <div className="p-10 text-center md:p-12">
              <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-solar/10 ring-1 ring-inset ring-solar/30">
                <Github className="h-8 w-8 text-solar" aria-hidden="true" />
              </span>
              <h2 className="mb-4 text-2xl font-semibold text-brand">
                {currentContent.opensource.title}
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
                {currentContent.opensource.description}
              </p>
              <Button
                asChild
                size="lg"
                className="rounded-full bg-brand-solid text-primary-foreground shadow-glow hover:bg-brand-solid/90"
              >
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" aria-hidden="true" />
                  {currentContent.opensource.cta}
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </SpotlightCard>
        </Reveal>
      </div>
    </div>
  );
}
