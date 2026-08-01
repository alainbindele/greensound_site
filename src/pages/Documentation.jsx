
import React, { useState, useEffect } from "react";
import { Documentation as DocEntity } from "@/api/entities";
import { useLanguage } from "@/components/AppContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Settings,
  Cpu,
  Code,
  Database,
  Lightbulb,
  Microscope,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { Stagger, StaggerItem, Reveal } from "@/components/motion/Reveal";
import {
  PageHero,
  SpotlightCard,
  EmptyState,
  SkeletonGrid,
  Chip,
} from "@/components/kit";

export default function Documentation() {
  const { language } = useLanguage();
  const [documentation, setDocumentation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const content = {
    it: {
      eyebrow: "Risorse tecniche",
      title: "Documentazione",
      subtitle: "Guide tecniche e risorse per GreenSound",
      noDocs: "Nessuna documentazione disponibile al momento",
      noDocsHint: "Torna a trovarci presto per nuove guide e risorse!",
      backToList: "Torna alla documentazione",
      downloadFile: "Scarica File",
      read: "Leggi",
      loading: "Caricamento documentazione",
      categories: {
        setup: "Installazione",
        hardware: "Hardware",
        software: "Software",
        api: "API",
        examples: "Esempi",
        research: "Ricerca"
      }
    },
    en: {
      eyebrow: "Technical resources",
      title: "Documentation",
      subtitle: "Technical guides and resources for GreenSound",
      noDocs: "No documentation available at the moment",
      noDocsHint: "Check back soon for new guides and resources!",
      backToList: "Back to documentation",
      downloadFile: "Download File",
      read: "Read",
      loading: "Loading documentation",
      categories: {
        setup: "Setup",
        hardware: "Hardware",
        software: "Software",
        api: "API",
        examples: "Examples",
        research: "Research"
      }
    }
  };

  const currentContent = content[language];

  const categoryIcons = {
    setup: Settings,
    hardware: Cpu,
    software: Code,
    api: Database,
    examples: Lightbulb,
    research: Microscope
  };

  useEffect(() => {
    loadDocumentation();
  }, []); // Run once on component mount

  const loadDocumentation = async () => {
    try {
      setLoading(true);
      const data = await DocEntity.list('order');
      setDocumentation(data);
    } catch (error) {
      console.error('Error loading documentation:', error);
      setDocumentation([]); // Set empty array on error to prevent further attempts
    } finally {
      setLoading(false);
    }
  };

  // Reading a detail should start at the top of the article, not wherever the
  // list happened to be scrolled to.
  useEffect(() => {
    if (selectedDoc) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedDoc]);

  const groupedDocs = documentation.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {});

  const docTitle = (doc) => (language === 'it' ? doc.title_it : doc.title_en);
  // Content is authored in a plain textarea, so it is text — never HTML.
  const docBody = (doc) => (language === 'it' ? doc.content_it : doc.content_en) || '';

  const DocumentationCard = ({ doc }) => {
    const CategoryIcon = categoryIcons[doc.category] || FileText;
    const excerpt = docBody(doc).slice(0, 150);

    return (
      <SpotlightCard as="article" className="h-full">
        <div className="flex h-full flex-col p-6">
          <div className="mb-4 flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 ring-1 ring-inset ring-brand/25">
              <CategoryIcon className="h-6 w-6 text-brand" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-semibold">{docTitle(doc)}</h3>
              <Chip tone="brand">{currentContent.categories[doc.category] || doc.category}</Chip>
            </div>
          </div>

          <p className="mb-6 line-clamp-3 text-sm text-muted-foreground">
            {excerpt}
            {docBody(doc).length > 150 ? '…' : ''}
          </p>

          <div className="mt-auto flex gap-2">
            {/* A real button, so the card is reachable by keyboard. */}
            <Button
              variant="outline"
              onClick={() => setSelectedDoc(doc)}
              className="flex-1 rounded-full border-brand/50 text-brand hover:bg-brand/10 hover:text-brand"
            >
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              {currentContent.read}
            </Button>
            {doc.file_url && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-brand hover:bg-brand/10"
              >
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${currentContent.downloadFile} — ${docTitle(doc)}`}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </SpotlightCard>
    );
  };

  const DocumentationDetail = ({ doc }) => {
    const CategoryIcon = categoryIcons[doc.category] || FileText;

    return (
      <div className="mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setSelectedDoc(null)}
          className="mb-6 text-brand hover:bg-brand/10 hover:text-brand"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          {currentContent.backToList}
        </Button>

        <SpotlightCard interactive={false} as="article">
          <div className="p-8 md:p-10">
            <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand/10 ring-1 ring-inset ring-brand/25">
                <CategoryIcon className="h-8 w-8 text-brand" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h1 className="mb-3 text-3xl font-bold md:text-4xl">{docTitle(doc)}</h1>
                <Chip tone="brand">
                  {currentContent.categories[doc.category] || doc.category}
                </Chip>
              </div>
              {doc.file_url && (
                <Button
                  asChild
                  className="rounded-full bg-brand-solid text-primary-foreground hover:bg-brand-solid/90"
                >
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    {currentContent.downloadFile}
                  </a>
                </Button>
              )}
            </div>

            <div className="hairline mb-8" aria-hidden="true" />

            {/* Plain text, rendered as plain text — line breaks preserved. */}
            <div className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
              {docBody(doc)}
            </div>
          </div>
        </SpotlightCard>
      </div>
    );
  };

  if (selectedDoc) {
    return (
      <div className="min-h-screen pb-24 pt-28 md:pt-32">
        <div className="shell">
          <DocumentationDetail doc={selectedDoc} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow={currentContent.eyebrow}
        icon={BookOpen}
        title={currentContent.title}
        subtitle={currentContent.subtitle}
      />

      <div className="shell pb-24">
        {loading ? (
          <SkeletonGrid count={6} media={false} label={currentContent.loading} />
        ) : Object.keys(groupedDocs).length === 0 ? (
          <EmptyState
            icon={FileText}
            title={currentContent.noDocs}
            description={currentContent.noDocsHint}
          />
        ) : (
          <Reveal>
            <Tabs defaultValue={Object.keys(groupedDocs)[0]} className="w-full">
              <TabsList className="mb-10 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted/60 p-1.5 md:grid-cols-3 lg:grid-cols-6">
                {Object.keys(groupedDocs).map((category) => {
                  const CategoryIcon = categoryIcons[category] || FileText;
                  return (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="flex min-h-[44px] items-center gap-2 rounded-xl data-[state=active]:bg-brand-solid data-[state=active]:text-primary-foreground data-[state=active]:shadow-e1"
                    >
                      <CategoryIcon className="h-4 w-4" aria-hidden="true" />
                      <span className="truncate">
                        {currentContent.categories[category] || category}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {Object.entries(groupedDocs).map(([category, docs]) => (
                <TabsContent key={category} value={category}>
                  <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {docs.map((doc) => (
                      <StaggerItem key={doc.id}>
                        <DocumentationCard doc={doc} />
                      </StaggerItem>
                    ))}
                  </Stagger>
                </TabsContent>
              ))}
            </Tabs>
          </Reveal>
        )}
      </div>
    </div>
  );
}
