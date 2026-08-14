import { Images, Megaphone, NotebookText, Pin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { EventPhoto, SiteAnnouncement } from "@/lib/poker-types";

interface EventDetailContentProps {
  eventTitle: string;
  notes?: string;
  photos?: EventPhoto[];
  announcements?: SiteAnnouncement[];
}

function PhotoGallery({
  eventTitle,
  photos,
}: {
  eventTitle: string;
  photos: EventPhoto[];
}) {
  return (
    <section
      aria-labelledby="event-photos-heading"
      className="max-w-4xl"
    >
      <div className="mb-3 flex items-center gap-2">
        <Images className="size-4 text-primary" aria-hidden="true" />
        <h2 id="event-photos-heading" className="text-lg font-semibold">
          Photos
        </h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <figure
            key={`${photo.src}-${index}`}
            className="group w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-sm"
          >
            <a
              href={photo.src}
              target="_blank"
              rel="noreferrer"
              className="block aspect-[4/3] overflow-hidden bg-muted"
              aria-label={`Open ${photo.caption ?? `${eventTitle} photo ${index + 1}`}`}
            >
              {/* User-supplied URLs are intentionally supported without a fixed Next image host list. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.caption ?? `${eventTitle} photo ${index + 1}`}
                width={2048}
                height={1536}
                className="size-full object-contain transition-opacity duration-300 group-hover:opacity-95"
                loading="lazy"
                decoding="async"
              />
            </a>
            {photo.caption ? (
              <figcaption className="border-t px-4 py-3 text-sm text-muted-foreground">
                {photo.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}

function NotesCard({ notes }: { notes: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 border-b">
        <NotebookText className="size-4 text-primary" aria-hidden="true" />
        <CardTitle className="text-base">Notes</CardTitle>
      </CardHeader>
      <CardContent className="whitespace-pre-line pt-5 text-sm leading-6 text-muted-foreground">
        {notes}
      </CardContent>
    </Card>
  );
}

function AnnouncementItem({
  announcement,
}: {
  announcement: SiteAnnouncement;
}) {
  return (
    <article className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{announcement.title}</h3>
          <time
            dateTime={announcement.date}
            className="mt-1 block text-xs text-muted-foreground"
          >
            {formatDate(announcement.date)}
          </time>
        </div>
        {announcement.pinned ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Pin className="size-3" aria-hidden="true" />
            Pinned
          </span>
        ) : null}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
        {announcement.body}
      </p>
    </article>
  );
}

function AnnouncementsCard({
  announcements,
}: {
  announcements: SiteAnnouncement[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 border-b">
        <Megaphone className="size-4 text-primary" aria-hidden="true" />
        <CardTitle className="text-base">
          {announcements.length === 1 ? "Update" : "Updates"}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y pt-5">
        {announcements.map((announcement) => (
          <AnnouncementItem
            key={announcement.id}
            announcement={announcement}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function EventDetailContent({
  eventTitle,
  notes,
  photos = [],
  announcements = [],
}: EventDetailContentProps) {
  if (!notes && photos.length === 0 && announcements.length === 0) return null;

  return (
    <div className="mt-8 space-y-6">
      {photos.length > 0 ? (
        <PhotoGallery eventTitle={eventTitle} photos={photos} />
      ) : null}
      {notes || announcements.length > 0 ? (
        <div
          className={
            notes && announcements.length > 0
              ? "grid gap-5 lg:grid-cols-2"
              : "grid gap-5"
          }
        >
          {notes ? <NotesCard notes={notes} /> : null}
          {announcements.length > 0 ? (
            <AnnouncementsCard announcements={announcements} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
