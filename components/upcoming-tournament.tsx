import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Coins, ListChecks, NotebookText, ShieldCheck, UserRound, Users } from "lucide-react";
import { EventDetailContent, TournamentBlindSchedule } from "@/components/event-detail-content";
import { PlayerAvatar } from "@/components/player-avatar";
import { TournamentMarkdown } from "@/components/tournament-markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import type { SiteAnnouncement, UpcomingTournament as UpcomingTournamentData } from "@/lib/poker-types";
import type { TournamentGuide } from "@/lib/tournament-guide";

interface UpcomingTournamentProps {
  tournament: UpcomingTournamentData;
  guide: TournamentGuide | null;
  announcements: SiteAnnouncement[];
}

function sectionIcon(title: string) {
  if (/rules|etiquette/i.test(title)) return ShieldCheck;
  if (/logistics|arrival|rsvp/i.test(title)) return ListChecks;
  if (/payout|rebuy|buy-in/i.test(title)) return Coins;
  return NotebookText;
}

export function UpcomingTournament({ tournament, guide, announcements }: UpcomingTournamentProps) {
  const hasDetails = Boolean(tournament.notes || tournament.photos?.length || announcements.length);
  const hasBlinds = Boolean(tournament.blindSchedule?.length);
  const sections = [
    ...(guide?.intro ? [{ id: "tournament-info", title: "Overview" }] : []),
    ...(guide?.sections.map(({ id, title }) => ({ id, title })) ?? []),
    ...(hasDetails ? [{ id: "event-details", title: "Updates & details" }] : []),
    { id: "registered-players", title: "Registered players" },
    ...(hasBlinds ? [{ id: "blind-schedule", title: "Blind schedule" }] : []),
  ];
  const summary = [
    { label: "Date", value: formatDate(tournament.date), icon: CalendarDays },
    { label: "Start time", value: formatTime(tournament.startTime), icon: Clock3 },
    { label: "Host", value: tournament.host, icon: UserRound },
    { label: "Buy-in", value: formatMoney(tournament.initialBuyIn), icon: Coins },
  ];

  return (
    <div className="page-shell py-8 sm:py-12">
      <Link href="/tournaments" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> All tournaments
      </Link>

      <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <Badge variant="secondary" className="mb-3 gap-1.5 text-primary">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" /> Upcoming
        </Badge>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{tournament.title}</h1>
        <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 border-t pt-5 sm:grid-cols-4">
          {summary.map(({ label, value, icon: Icon }) => (
            <div key={label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5 text-primary" aria-hidden="true" />{label}</dt>
              <dd className="numeric mt-1.5 text-sm font-semibold sm:text-base">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-9">
        <nav aria-label="Tournament sections" className="min-w-0 lg:sticky lg:top-24">
          <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">On this page</p>
          <div className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:shrink">
                {section.title}
              </a>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-6">
          {guide?.intro ? (
            <section id="tournament-info" aria-label="Tournament overview" className="scroll-mt-24">
              <Card><CardContent className="p-5 sm:p-6"><TournamentMarkdown>{guide.intro}</TournamentMarkdown></CardContent></Card>
            </section>
          ) : null}

          {guide?.sections.map((section) => {
            const Icon = sectionIcon(section.title);
            return (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-24">
                <Card className="p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-2.5">
                    <Icon className="size-4.5 text-primary" aria-hidden="true" />
                    <h2 id={`${section.id}-heading`} className="text-lg font-semibold tracking-tight">{section.title}</h2>
                  </div>
                  <TournamentMarkdown>{section.markdown}</TournamentMarkdown>
                </Card>
              </section>
            );
          })}

          {hasDetails ? (
            <section id="event-details" aria-label="Event updates and details" className="scroll-mt-24 [&>div]:mt-0">
              <EventDetailContent eventTitle={tournament.title} notes={tournament.notes} photos={tournament.photos} announcements={announcements} />
            </section>
          ) : null}

          <section id="registered-players" aria-labelledby="registered-players-heading" className="scroll-mt-24">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <Users className="size-4.5 text-primary" aria-hidden="true" />
                  <h2 id="registered-players-heading" className="text-lg font-semibold tracking-tight">Registered players</h2>
                </div>
                <span className="numeric rounded-full bg-muted px-2.5 py-1 text-xs font-semibold" aria-label={`${tournament.players.length} registered players`}>{tournament.players.length}</span>
              </div>
              <CardContent className="p-5 sm:p-6">
                {tournament.players.length ? (
                  <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    {tournament.players.map((player) => (
                      <li key={player.name} className="flex min-w-0 items-center gap-3">
                        <PlayerAvatar name={player.name} className="size-9" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{player.name}</p>
                          <p className="numeric mt-0.5 text-xs text-muted-foreground">Buy-in: {formatMoney(player.totalBuyIn)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">No players registered yet.</p>}
                {tournament.players.length > 0 ? <p className="numeric mt-5 border-t pt-4 text-xs text-muted-foreground">Total buy-ins: <span className="font-semibold text-foreground">{formatMoney(tournament.players.reduce((sum, player) => sum + player.totalBuyIn, 0))}</span></p> : null}
              </CardContent>
            </Card>
          </section>

          {hasBlinds ? (
            <section id="blind-schedule" aria-label="Blind schedule" className="scroll-mt-24 [&>div]:max-w-none">
              <TournamentBlindSchedule schedule={tournament.blindSchedule!} />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
