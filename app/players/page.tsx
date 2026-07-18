import type { Metadata } from "next";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import { PageIntro } from "@/components/page-intro";
import { PlayerDirectory } from "@/components/player-directory";
import { getPlayerProfiles } from "@/lib/poker-data";
import type { CashGame, Tournament } from "@/lib/poker-types";
import { parsePlayerViewMode } from "@/lib/player-view";

export const metadata: Metadata = {
  title: "Players",
  description:
    "Player profiles with tournament finishes, cash-game results, and profit trends.",
};

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];

interface PlayersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const params = await searchParams;
  const players = getPlayerProfiles(tournaments, cashGames);
  const initialMode = parsePlayerViewMode(params.mode);

  return (
    <div className="page-shell py-10 sm:py-14">
      <PageIntro
        eyebrow="Player profiles"
        title="Everyone has a story in the stats."
        description="Open any profile for monthly profit trends, tournament finishes, cash-game form, and a complete event history."
      />

      <PlayerDirectory
        key={initialMode}
        players={players}
        initialMode={initialMode}
      />
    </div>
  );
}
