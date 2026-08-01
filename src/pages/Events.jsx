import React, { useState, useEffect } from "react";
import { Event } from "@/api/entities";
import { useLanguage } from "@/components/AppContext";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ExternalLink, Star, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import ImageSlideshow from "@/components/ImageSlideshow";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import {
  PageHero,
  SectionHeading,
  SpotlightCard,
  EmptyState,
  SkeletonGrid,
  Chip,
} from "@/components/kit";

export default function Events() {
  const { language } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const content = {
    it: {
      eyebrow: "Agenda",
      title: "Eventi",
      subtitle: "Prossimi appuntamenti e performance",
      noEvents: "Nessun evento in programma al momento",
      noEventsHint: "Torna a trovarci presto per nuovi eventi e performance!",
      featured: "In Evidenza",
      viewDetails: "Dettagli",
      upcoming: "Prossimi",
      upcomingHint: "Date confermate, aperte al pubblico.",
      past: "Passati",
      pastHint: "L'archivio delle performance già andate in scena.",
      loading: "Caricamento eventi",
    },
    en: {
      eyebrow: "Agenda",
      title: "Events",
      subtitle: "Upcoming appointments and performances",
      noEvents: "No events scheduled at the moment",
      noEventsHint: "Check back soon for new events and performances!",
      featured: "Featured",
      viewDetails: "View Details",
      upcoming: "Upcoming",
      upcomingHint: "Confirmed dates, open to the public.",
      past: "Past",
      pastHint: "The archive of performances already staged.",
      loading: "Loading events",
    },
  };

  const currentContent = content[language];

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await Event.list('-date');
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const locale = language === 'it' ? it : enUS;
    return format(date, 'PPP p', { locale });
  };

  const isUpcoming = (dateString) => {
    return new Date(dateString) > new Date();
  };

  // Get images array, fallback to image_url for backward compatibility
  const getEventImages = (event) => {
    if (event.images && event.images.length > 0) {
      return event.images;
    } else if (event.image_url) {
      return [event.image_url];
    }
    return [];
  };

  const upcomingEvents = events.filter(event => isUpcoming(event.date));
  const pastEvents = events.filter(event => !isUpcoming(event.date));

  const EventCard = ({ event, upcoming }) => {
    const images = getEventImages(event);
    const title = language === 'it' ? event.title_it : event.title_en;

    return (
      <SpotlightCard as="article" className="flex h-full flex-col">
        {images.length > 0 && (
          <div className="relative h-48 overflow-hidden">
            <div className={upcoming ? '' : 'opacity-60 saturate-50'}>
              <ImageSlideshow
                images={images}
                alt={title}
                className="h-full"
                autoPlay={upcoming}
              />
            </div>
            <div className="absolute left-4 top-4 z-10 flex gap-2">
              {event.featured && (
                <Chip tone="solar" className="backdrop-blur">
                  <Star className="h-3 w-3" aria-hidden="true" />
                  {currentContent.featured}
                </Chip>
              )}
              {!upcoming && (
                <Chip tone="muted" className="backdrop-blur">
                  {currentContent.past}
                </Chip>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-xl font-semibold">{title}</h3>
            {images.length === 0 && event.featured && (
              <Chip tone="solar">
                <Star className="h-3 w-3" aria-hidden="true" />
                {currentContent.featured}
              </Chip>
            )}
          </div>

          <dl className="mb-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <dt className="sr-only">{language === 'it' ? 'Data' : 'Date'}</dt>
              <Calendar className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <dd className="text-muted-foreground">
                <time dateTime={event.date}>{formatEventDate(event.date)}</time>
              </dd>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <dt className="sr-only">{language === 'it' ? 'Luogo' : 'Location'}</dt>
                <MapPin className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <dd className="text-muted-foreground">{event.location}</dd>
              </div>
            )}
          </dl>

          <p className="mb-6 line-clamp-3 text-sm text-muted-foreground">
            {language === 'it' ? event.description_it : event.description_en}
          </p>

          {event.external_link && (
            <Button
              asChild
              variant="outline"
              className="mt-auto w-full rounded-full border-brand/50 text-brand hover:bg-brand/10 hover:text-brand"
            >
              <a href={event.external_link} target="_blank" rel="noopener noreferrer">
                {currentContent.viewDetails}
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                <span className="sr-only">
                  {language === 'it' ? '(si apre in una nuova scheda)' : '(opens in a new tab)'}
                </span>
              </a>
            </Button>
          )}
        </div>
      </SpotlightCard>
    );
  };

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow={currentContent.eyebrow}
        icon={CalendarDays}
        title={currentContent.title}
        subtitle={currentContent.subtitle}
      />

      <div className="shell pb-24">
        {loading ? (
          <SkeletonGrid count={6} label={currentContent.loading} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={currentContent.noEvents}
            description={currentContent.noEventsHint}
          />
        ) : (
          <div className="space-y-20">
            {upcomingEvents.length > 0 && (
              <section>
                <SectionHeading
                  title={currentContent.upcoming}
                  description={currentContent.upcomingHint}
                />
                <Stagger className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingEvents.map((event) => (
                    <StaggerItem key={event.id}>
                      <EventCard event={event} upcoming />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}

            {pastEvents.length > 0 && (
              <section>
                <SectionHeading
                  title={currentContent.past}
                  description={currentContent.pastHint}
                />
                <Stagger className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {pastEvents.map((event) => (
                    <StaggerItem key={event.id}>
                      <EventCard event={event} upcoming={false} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
