import Link from "next/link";
import { CalendarDays, CircleDollarSign, MapPin, Megaphone, Users } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDate, formatMoney, formatSignedMoney, formatTime } from "@/lib/format";
import { compareTournamentPlacements } from "@/lib/poker-placement";
import type { CashGame, EventPhoto, Tournament } from "@/lib/poker-types";

export interface EventCardAnnouncement {
  title: string;
  body?: string;
}

function Meta({ icon: Icon, children }: { icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="size-3.5 text-primary" aria-hidden="true" />
      {children}
    </span>
  );
}

function getFeaturedPhoto(event: Tournament | CashGame) {
  return event.photos?.find((photo) => photo.src.trim());
}

function EventImage({ photo, title }: { photo: EventPhoto; title: string }) {
  return (
    <figure className="relative aspect-[4/3] overflow-hidden border-b bg-muted">
      {/* Event photos are user-managed content, so their dimensions and hosts are intentionally unrestricted. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.caption || `${title} photo`}
        width={2048}
        height={1536}
        className="size-full object-contain transition-opacity duration-300 group-hover:opacity-95"
        loading="lazy"
      />
      {photo.caption ? (
        <figcaption className="sr-only">{photo.caption}</figcaption>
      ) : null}
    </figure>
  );
}

function CardMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 px-5 py-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 text-primary" aria-hidden="true" />
        {label}
      </div>
      <p className="numeric mt-2 text-xl font-bold leading-none tracking-[-0.025em] text-foreground">
        {value}
      </p>
    </div>
  );
}

function AnnouncementCallout({ announcement }: { announcement: EventCardAnnouncement }) {
  return (
    <div className="mx-5 mb-5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Megaphone className="size-3.5" aria-hidden="true" />
        {announcement.title}
      </div>
      {announcement.body ? (
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {announcement.body}
        </p>
      ) : null}
    </div>
  );
}

const eventCardClassName =
  "group flex h-full flex-col overflow-hidden border-border/90 bg-white shadow-[0_1px_2px_rgba(15,35,22,0.04)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_12px_30px_rgba(13,55,29,0.09)]";

export function TournamentCard({
  tournament,
  announcement,
}: {
  tournament: Tournament;
  announcement?: EventCardAnnouncement;
}) {
  const completed = tournament.status === "completed";
  const rankedPlayers = completed
    ? tournament.players.toSorted((a, b) => compareTournamentPlacements(a.placement, b.placement))
    : [];
  const bestPlacement = rankedPlayers[0]?.placement;
  const champions = bestPlacement === undefined
    ? []
    : rankedPlayers.filter((player) => compareTournamentPlacements(player.placement, bestPlacement) === 0);
  const prizePool = tournament.players.reduce((total, player) => total + player.totalBuyIn, 0);
  const photo = getFeaturedPhoto(tournament);

  return (
    <Link href={`/tournaments/${tournament.slug}`} className="block h-full">
      <Card className={eventCardClassName}>
        {photo ? <EventImage photo={photo} title={tournament.title} /> : null}
        <CardHeader className="gap-4 p-5 pb-5">
          <div>
            <h3 className="text-xl font-bold leading-tight tracking-[-0.025em]">{tournament.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Host: <span className="font-semibold text-foreground">{tournament.host}</span></p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Meta icon={CalendarDays}>{formatDate(tournament.date)}</Meta>
            <Meta icon={MapPin}>{tournament.venue}</Meta>
          </div>
        </CardHeader>
        {announcement ? <AnnouncementCallout announcement={announcement} /> : null}
        <CardContent className="mt-auto grid grid-cols-2 divide-x border-t px-0 pb-0">
          <CardMetric icon={Users} label="Players" value={tournament.players.length} />
          <CardMetric
            icon={CircleDollarSign}
            label={completed ? "Total buy-ins" : "Buy-in"}
            value={formatMoney(completed ? prizePool : tournament.initialBuyIn)}
          />
        </CardContent>
        {champions.length > 0 ? (
          <CardFooter className="border-t px-5 py-3.5 text-sm">
            <span className="min-w-0"><span className="text-muted-foreground">{champions.length > 1 ? "Tied 1st" : "1st place"}</span> <span className="ml-1 font-semibold">{champions.map((player) => player.name).join(", ")}</span></span>
          </CardFooter>
        ) : tournament.status === "upcoming" && tournament.startTime ? (
          <CardFooter className="border-t px-5 py-3.5 text-sm text-muted-foreground">
            Starts <span className="ml-1 font-semibold text-foreground">{formatTime(tournament.startTime)}</span>
          </CardFooter>
        ) : null}
      </Card>
    </Link>
  );
}

export function CashGameCard({
  game,
  announcement,
}: {
  game: CashGame;
  announcement?: EventCardAnnouncement;
}) {
  const completed = game.status === "completed";
  const results = completed
    ? game.players.map((player) => ({ ...player, profit: player.amountAtEnd - player.amountBuyIn }))
    : [];
  const biggestWinner = results.toSorted((a, b) => b.profit - a.profit)[0];
  const tableTotal = game.players.reduce((total, player) => total + player.amountBuyIn, 0);
  const photo = getFeaturedPhoto(game);

  return (
    <Link href={`/cash-games/${game.slug}`} className="block h-full">
      <Card className={eventCardClassName}>
        {photo ? <EventImage photo={photo} title={game.title} /> : null}
        <CardHeader className="gap-4 p-5 pb-5">
          <div>
            <h3 className="text-xl font-bold leading-tight tracking-[-0.025em]">{game.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Host: <span className="font-semibold text-foreground">{game.host}</span></p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Meta icon={CalendarDays}>{formatDate(game.date)}</Meta>
            <Meta icon={MapPin}>{game.venue}</Meta>
          </div>
        </CardHeader>
        {announcement ? <AnnouncementCallout announcement={announcement} /> : null}
        <CardContent className="mt-auto grid grid-cols-2 divide-x border-t px-0 pb-0">
          <CardMetric icon={Users} label="Players" value={game.players.length} />
          <CardMetric
            icon={CircleDollarSign}
            label={completed ? "Total buy-ins" : "Buy-in"}
            value={formatMoney(completed ? tableTotal : game.initialBuyIn)}
          />
        </CardContent>
        {biggestWinner ? (
          <CardFooter className="border-t px-5 py-3.5 text-sm">
            <div className="flex w-full items-center justify-between gap-3">
              <span><span className="text-muted-foreground">Highest net</span> <span className="ml-1 font-semibold">{biggestWinner.name}</span></span>
              <span className="numeric text-base font-bold text-positive">{formatSignedMoney(biggestWinner.profit)}</span>
            </div>
          </CardFooter>
        ) : game.status === "upcoming" && game.startTime ? (
          <CardFooter className="border-t px-5 py-3.5 text-sm text-muted-foreground">
            Starts <span className="ml-1 font-semibold text-foreground">{formatTime(game.startTime)}</span>
          </CardFooter>
        ) : null}
      </Card>
    </Link>
  );
}
