import React, { useState, useEffect } from "react";
import { Article } from "@/api/entities";
import { useLanguage } from "@/components/AppContext";
import { Button } from "@/components/ui/button";
import { FileText, Star, Clock, User, Tag, ArrowLeft, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import ImageSlideshow from "@/components/ImageSlideshow";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import {
  PageHero,
  SpotlightCard,
  EmptyState,
  SkeletonGrid,
  Chip,
} from "@/components/kit";

export default function Articles() {
  const { language } = useLanguage();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'featured'

  const content = {
    it: {
      eyebrow: "Approfondimenti",
      title: "Articoli",
      subtitle: "Approfondimenti su GreenSound e bio-tecnologia",
      noArticles: "Nessun articolo disponibile al momento",
      noArticlesHint: "Torna a trovarci presto per nuovi contenuti!",
      featured: "In Evidenza",
      readMore: "Leggi di più",
      backToList: "Torna agli articoli",
      publishedOn: "Pubblicato il",
      by: "di",
      allArticles: "Tutti",
      featuredArticles: "In Evidenza",
      loading: "Caricamento articoli",
      filterLabel: "Filtra articoli",
    },
    en: {
      eyebrow: "Insights",
      title: "Articles",
      subtitle: "Insights on GreenSound and bio-technology",
      noArticles: "No articles available at the moment",
      noArticlesHint: "Check back soon for new content!",
      featured: "Featured",
      readMore: "Read more",
      backToList: "Back to articles",
      publishedOn: "Published on",
      by: "by",
      allArticles: "All",
      featuredArticles: "Featured",
      loading: "Loading articles",
      filterLabel: "Filter articles",
    }
  };

  const currentContent = content[language];

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const data = await Article.filter({ published: true }, '-created_date');
      setArticles(data);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Opening an article should start at the top of it.
  useEffect(() => {
    if (selectedArticle) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedArticle]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const locale = language === 'it' ? it : enUS;
    return format(date, 'PPP', { locale });
  };

  const filteredArticles = articles.filter(article => {
    if (filter === 'featured') return article.featured;
    return true;
  });

  // Get images array, fallback to image_url for backward compatibility
  const getArticleImages = (article) => {
    if (article.images && article.images.length > 0) {
      return article.images;
    } else if (article.image_url) {
      return [article.image_url];
    }
    return [];
  };

  const articleTitle = (article) =>
    language === 'it' ? article.title_it : article.title_en;
  // Authored in a plain textarea — treat as text, never as markup.
  const articleBody = (article) =>
    (language === 'it' ? article.content_it : article.content_en) || '';
  const articleExcerpt = (article) => {
    const explicit = language === 'it' ? article.excerpt_it : article.excerpt_en;
    if (explicit) return explicit;
    const body = articleBody(article);
    return body.length > 150 ? `${body.slice(0, 150)}…` : body;
  };

  const ArticleCard = ({ article }) => {
    const images = getArticleImages(article);

    return (
      <SpotlightCard as="article" className="flex h-full flex-col">
        {images.length > 0 && (
          <div className="relative h-48 overflow-hidden">
            <ImageSlideshow
              images={images}
              alt={articleTitle(article)}
              className="h-full"
              autoPlay={true}
            />
            {article.featured && (
              <Chip tone="solar" className="absolute left-4 top-4 z-10 backdrop-blur">
                <Star className="h-3 w-3" aria-hidden="true" />
                {currentContent.featured}
              </Chip>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-xl font-semibold">
              {articleTitle(article)}
            </h3>
            {images.length === 0 && article.featured && (
              <Chip tone="solar">
                <Star className="h-3 w-3" aria-hidden="true" />
                {currentContent.featured}
              </Chip>
            )}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-brand" aria-hidden="true" />
              <time dateTime={article.created_date}>
                {formatDate(article.created_date)}
              </time>
            </span>
            {article.created_by && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-brand" aria-hidden="true" />
                {article.created_by}
              </span>
            )}
          </div>

          <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
            {articleExcerpt(article)}
          </p>

          {article.tags && article.tags.length > 0 && (
            <ul className="mb-6 flex flex-wrap gap-2">
              {article.tags.slice(0, 3).map((tag) => (
                <li key={tag}>
                  <Chip tone="muted">
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    {tag}
                  </Chip>
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="outline"
            onClick={() => setSelectedArticle(article)}
            className="mt-auto w-full rounded-full border-brand/50 text-brand hover:bg-brand/10 hover:text-brand"
          >
            {currentContent.readMore}
            <span className="sr-only">: {articleTitle(article)}</span>
          </Button>
        </div>
      </SpotlightCard>
    );
  };

  const ArticleDetail = ({ article }) => {
    const images = getArticleImages(article);

    return (
      <div className="mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setSelectedArticle(null)}
          className="mb-6 text-brand hover:bg-brand/10 hover:text-brand"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          {currentContent.backToList}
        </Button>

        <SpotlightCard interactive={false} as="article">
          {images.length > 0 && (
            <div className="h-64 overflow-hidden md:h-80">
              <ImageSlideshow
                images={images}
                alt={articleTitle(article)}
                className="h-full"
                autoPlay={false}
              />
            </div>
          )}

          <div className="p-8 md:p-10">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold md:text-4xl">
                {articleTitle(article)}
              </h1>
              {article.featured && (
                <Chip tone="solar" className="shrink-0">
                  <Star className="h-3 w-3" aria-hidden="true" />
                  {currentContent.featured}
                </Chip>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand" aria-hidden="true" />
                {currentContent.publishedOn}{' '}
                <time dateTime={article.created_date}>
                  {formatDate(article.created_date)}
                </time>
              </span>
              {article.created_by && (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-brand" aria-hidden="true" />
                  {currentContent.by} {article.created_by}
                </span>
              )}
            </div>

            <div className="hairline my-8" aria-hidden="true" />

            {article.tags && article.tags.length > 0 && (
              <ul className="mb-8 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <li key={tag}>
                    <Chip tone="muted">
                      <Tag className="h-3 w-3" aria-hidden="true" />
                      {tag}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}

            <div className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground md:text-lg">
              {articleBody(article)}
            </div>
          </div>
        </SpotlightCard>
      </div>
    );
  };

  if (selectedArticle) {
    return (
      <div className="min-h-screen pb-24 pt-28 md:pt-32">
        <div className="shell">
          <ArticleDetail article={selectedArticle} />
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
        {/* Filters */}
        {!loading && articles.length > 0 && (
          <Reveal className="mb-12 flex justify-center">
            <div
              role="group"
              aria-label={currentContent.filterLabel}
              className="inline-flex gap-1 rounded-full border border-border bg-card/60 p-1"
            >
              {[
                { key: 'all', label: currentContent.allArticles, icon: null },
                { key: 'featured', label: currentContent.featuredArticles, icon: Star },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={`flex min-h-[40px] items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors ${
                    filter === key
                      ? 'bg-brand-solid text-primary-foreground shadow-e1'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  {label}
                </button>
              ))}
            </div>
          </Reveal>
        )}

        {loading ? (
          <SkeletonGrid count={6} label={currentContent.loading} />
        ) : filteredArticles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={currentContent.noArticles}
            description={currentContent.noArticlesHint}
          />
        ) : (
          <Stagger className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <StaggerItem key={article.id}>
                <ArticleCard article={article} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </div>
  );
}
