import Link from "next/link";
import { Megaphone, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { SiteAnnouncement } from "@/lib/poker-types";

function eventHref(announcement: SiteAnnouncement) {
  if (!announcement.eventSlug || !announcement.eventType) {
    return null;
  }

  return announcement.eventType === "tournament"
    ? `/tournaments/${announcement.eventSlug}`
    : `/cash-games/${announcement.eventSlug}`;
}

export function HomeAnnouncements({
  announcements,
}: {
  announcements: SiteAnnouncement[];
}) {
  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {announcements.map((announcement) => {
        const href = eventHref(announcement);

        return (
          <Card key={announcement.id} className="p-5">
            <article>
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Megaphone className="size-4.5" aria-hidden="true" />
                </span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {announcement.pinned ? (
                    <Badge variant="secondary" className="gap-1">
                      <Pin className="size-3" aria-hidden="true" />
                      Pinned
                    </Badge>
                  ) : null}
                  <time
                    dateTime={announcement.date}
                    className="text-xs text-muted-foreground"
                  >
                    {formatDate(announcement.date)}
                  </time>
                </div>
              </div>

              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {announcement.title}
              </h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {announcement.body}
              </p>

              {href ? (
                <Link
                  href={href}
                  className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
                >
                  {announcement.eventTitle ?? "View event"}
                </Link>
              ) : null}
            </article>
          </Card>
        );
      })}
    </div>
  );
}
