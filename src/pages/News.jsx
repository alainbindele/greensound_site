import React, { useState, useEffect } from "react";
import { News } from "@/api/entities";
import { useLanguage } from "@/components/AppContext";
import { Button } from "@/components/ui/button";
import {
  Newspaper,
  Clock,
  User,
  ExternalLink,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import ImageSlideshow from "@/components/ImageSlideshow";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import {
  PageHero,
  SpotlightCard,
  EmptyState,
  SkeletonGrid,
} from "@/components/kit";

export default function NewsPage() {
  const { language } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);

  const content = {
    it: {
      eyebrow: "Aggiornamenti",
      title: "News",
      subtitle: "Ultime novità e aggiornamenti su GreenSound",
      noNews: "Nessuna news disponibile al momento",
      noNewsHint: "Torna a trovarci presto per nuovi aggiornamenti!",
      urgent: "Urgente",
      readMore: "Leggi di più",
      backToList: "Torna alle news",
      publishedOn: "Pubblicato il",
      by: "di",
      viewExternal: "Visualizza",
      loading: "Caricamento news",
    },
    en: {
      eyebrow: "Updates",
      title: "News",
      subtitle: "Latest news and updates on GreenSound",
      noNews: "No news available at the moment",
      noNewsHint: "Check back soon for new updates!",
      urgent: "Urgent",
      readMore: "Read more",
      backToList: "Back to news",
      publishedOn: "Published on",
      by: "by",
      viewExternal: "View",
      loading: "Loading news",
    }
  };

  const currentContent = content[language];

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const data = await News.list('-created_date');
      setNews(data);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedNews) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedNews]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const locale = language === 'it' ? it : enUS;
    return format(date, 'PPP', { locale });
  };

  // Get images array, fallback to image_url for backward compatibility
  const getNewsImages = (newsItem) => {
    if (newsItem.images && newsItem.images.length > 0) {
      return newsItem.images;
    } else if (newsItem.image_url) {
      return [newsItem.image_url];
    }
    return [];
  };

  const newsTitle = (item) => (language === 'it' ? item.title_it : item.title_en);
  // Authored in a plain textarea — treat as text, never as markup.
  const newsBody = (item) =>
    (language === 'it' ? item.content_it : item.content_en) || '';

  const UrgentChip = ({ className = "" }) => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground ${className}`}
    >
      <AlertCircle className="h-3 w-3" aria-hidden="true" />
      {currentContent.urgent}
    </span>
  );

  const NewsCard = ({ newsItem }) => {
    const images = getNewsImages(newsItem);
    const body = newsBody(newsItem);

    return (
      <SpotlightCard
        as="article"
        className={`flex h-full flex-col ${
          newsItem.urgent ? 'ring-2 ring-destructive/50' : ''
        }`}
      >
        {images.length > 0 && (
          <div className="relative h-48 overflow-hidden">
            <ImageSlideshow
              images={images}
              alt={newsTitle(newsItem)}
              className="h-full"
              autoPlay={true}
            />
            {newsItem.urgent && (
              <UrgentChip className="absolute left-4 top-4 z-10 backdrop-blur" />
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-xl font-semibold">
              {newsTitle(newsItem)}
            </h3>
            {images.length === 0 && newsItem.urgent && <UrgentChip />}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-brand" aria-hidden="true" />
              <time dateTime={newsItem.created_date}>
                {formatDate(newsItem.created_date)}
              </time>
            </span>
            {newsItem.created_by && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-brand" aria-hidden="true" />
                {newsItem.created_by}
              </span>
            )}
          </div>

          <p className="mb-6 line-clamp-3 text-sm text-muted-foreground">
            {body.length > 150 ? `${body.slice(0, 150)}…` : body}
          </p>

          <div className="mt-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedNews(newsItem)}
              className="flex-1 rounded-full border-brand/50 text-brand hover:bg-brand/10 hover:text-brand"
            >
              {currentContent.readMore}
              <span className="sr-only">: {newsTitle(newsItem)}</span>
            </Button>
            {newsItem.external_link && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-brand hover:bg-brand/10"
              >
                <a
                  href={newsItem.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${currentContent.viewExternal} — ${newsTitle(newsItem)}`}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </SpotlightCard>
    );
  };

  const NewsDetail = ({ newsItem }) => {
    const images = getNewsImages(newsItem);

    return (
      <div className="mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setSelectedNews(null)}
          className="mb-6 text-brand hover:bg-brand/10 hover:text-brand"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          {currentContent.backToList}
        </Button>

        <SpotlightCard
          interactive={false}
          as="article"
          className={newsItem.urgent ? 'ring-2 ring-destructive/50' : ''}
        >
          {images.length > 0 && (
            <div className="h-64 overflow-hidden md:h-80">
              <ImageSlideshow
                images={images}
                alt={newsTitle(newsItem)}
                className="h-full"
                autoPlay={false}
              />
            </div>
          )}

          <div className="p-8 md:p-10">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold md:text-4xl">
                {newsTitle(newsItem)}
              </h1>
              {newsItem.urgent && <UrgentChip className="shrink-0" />}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand" aria-hidden="true" />
                {currentContent.publishedOn}{' '}
                <time dateTime={newsItem.created_date}>
                  {formatDate(newsItem.created_date)}
                </time>
              </span>
              {newsItem.created_by && (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-brand" aria-hidden="true" />
                  {currentContent.by} {newsItem.created_by}
                </span>
              )}
              {newsItem.external_link && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full border-brand/50 text-brand hover:bg-brand/10 hover:text-brand"
                >
                  <a
                    href={newsItem.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {currentContent.viewExternal}
                    <ExternalLink className="ml-2 h-3 w-3" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </div>

            <div className="hairline my-8" aria-hidden="true" />

            <div className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground md:text-lg">
              {newsBody(newsItem)}
            </div>
          </div>
        </SpotlightCard>
      </div>
    );
  };

  if (selectedNews) {
    return (
      <div className="min-h-screen pb-24 pt-28 md:pt-32">
        <div className="shell">
          <NewsDetail newsItem={selectedNews} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow={currentContent.eyebrow}
        icon={Newspaper}
        title={currentContent.title}
        subtitle={currentContent.subtitle}
      />

      <div className="shell pb-24">
        {loading ? (
          <SkeletonGrid count={6} label={currentContent.loading} />
        ) : news.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={currentContent.noNews}
            description={currentContent.noNewsHint}
          />
        ) : (
          <Stagger className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {news.map((newsItem) => (
              <StaggerItem key={newsItem.id}>
                <NewsCard newsItem={newsItem} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </div>
  );
}
