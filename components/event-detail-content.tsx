import { Clock3, Images, ListOrdered, Megaphone, NotebookText, Pin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import type { EventPhoto, SiteAnnouncement, TournamentBlindLevel } from "@/lib/poker-types";

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

function formatBlindDuration(duration: TournamentBlindLevel["duration"]) {
  return typeof duration === "number" ? `${duration} min` : duration;
}

function estimatedDuration(schedule: TournamentBlindLevel[]) {
  let totalMinutes = 0;
  let hasDuration = false;
  let approximate = false;

  for (const entry of schedule) {
    const minutes =
      typeof entry.duration === "number"
        ? entry.duration
        : Number.parseFloat(entry.duration.match(/^\s*(\d+(?:\.\d+)?)/)?.[1] ?? "NaN");
    if (!Number.isFinite(minutes)) continue;
    totalMinutes += minutes;
    hasDuration = true;
    if (typeof entry.duration === "string" && entry.duration.includes("+")) {
      approximate = true;
    }
  }

  if (!hasDuration) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  const parts = [hours > 0 ? `${hours} hr` : "", minutes > 0 ? `${minutes} min` : ""].filter(Boolean);
  return `${parts.join(" ") || "0 min"}${approximate ? "+" : ""}`;
}

export function TournamentBlindSchedule({
  schedule,
}: {
  schedule: TournamentBlindLevel[];
}) {
  const totalTime = estimatedDuration(schedule);

  return (
    <Card className="max-w-3xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b">
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 text-primary" aria-hidden="true" />
          <CardTitle className="text-base">Blind schedule</CardTitle>
        </div>
        {totalTime ? (
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Total estimated time</p>
            <p className="numeric text-sm font-semibold">{totalTime}</p>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead>Level</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" aria-hidden="true" /> Duration
                </span>
              </TableHead>
              <TableHead>Small blind</TableHead>
              <TableHead>Big blind</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((entry, index) => (
              <TableRow key={`${entry.level}-${index}`}>
                <TableCell className="font-medium">{entry.level}</TableCell>
                <TableCell>{formatBlindDuration(entry.duration)}</TableCell>
                <TableCell className="numeric">
                  {entry.smallBlind === undefined ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    formatMoney(entry.smallBlind)
                  )}
                </TableCell>
                <TableCell className="numeric">
                  {entry.bigBlind === undefined ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    formatMoney(entry.bigBlind)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
