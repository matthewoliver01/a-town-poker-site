import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { formatDate, formatTime, formatUpdatedAt } from "../lib/format.ts";
import { getPlayerProfiles } from "../lib/poker-data.ts";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
let appServer;
let origin;
let serverLogs = "";

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a local test port"));
        return;
      }

      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

function recordServerLog(chunk) {
  serverLogs = `${serverLogs}${chunk}`.slice(-12_000);
}

before(async () => {
  const port = await reservePort();
  origin = `http://127.0.0.1:${port}`;
  appServer = spawn(
    process.execPath,
    [nextCli, "start", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  appServer.stdout.on("data", recordServerLog);
  appServer.stderr.on("data", recordServerLog);

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (appServer.exitCode !== null) {
      throw new Error(`Next.js exited before becoming ready.\n${serverLogs}`);
    }

    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Next.js did not become ready in time.\n${serverLogs}`);
}, { timeout: 40_000 });

after(async () => {
  if (!appServer || appServer.exitCode !== null) return;

  appServer.kill("SIGTERM");
  await Promise.race([
    once(appServer, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (appServer.exitCode === null) appServer.kill("SIGKILL");
});

const [tournaments, cashGames, siteMetadata] = await Promise.all([
  readFile(new URL("../data/tournaments.json", import.meta.url), "utf8").then(
    JSON.parse,
  ),
  readFile(new URL("../data/cash-games.json", import.meta.url), "utf8").then(
    JSON.parse,
  ),
  readFile(new URL("../data/site-metadata.json", import.meta.url), "utf8").then(
    JSON.parse,
  ),
]);

const latestCompletedTournament = tournaments
  .filter((event) => event.status === "completed")
  .sort((a, b) => b.date.localeCompare(a.date))[0];
const detailTournament =
  tournaments.find((event) => event.status === "upcoming") ?? tournaments[0];
const latestCompletedCashGame = cashGames
  .filter((event) => event.status === "completed")
  .sort((a, b) => b.date.localeCompare(a.date))[0];
const completedTournaments = tournaments.filter(
  (event) => event.status === "completed",
);
const incompleteTournament = completedTournaments.find((event) =>
  event.players.some(
    (player) =>
      !player.eliminationLevel &&
      !player.eliminatedAt &&
      !player.eliminatedBy,
  ),
);
const completedCashGames = cashGames.filter(
  (event) => event.status === "completed",
);
const cashGamePlayerNames = new Set(
  completedCashGames.flatMap((event) =>
    event.players.map((player) => player.name),
  ),
);
const tournamentOnlyPlayerName = completedTournaments
  .flatMap((event) => event.players)
  .find((player) => !cashGamePlayerNames.has(player.name))?.name;
const mixedFormatPlayerName = completedTournaments
  .flatMap((event) => event.players)
  .find((player) => cashGamePlayerNames.has(player.name))?.name;

assert.ok(
  mixedFormatPlayerName,
  "The player page test needs a player with completed results in both formats",
);

const mixedFormatPlayerSlug = mixedFormatPlayerName
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const mixedPlayerCashGame = completedCashGames.find((event) =>
  event.players.some((player) => player.name === mixedFormatPlayerName),
);
const testPlayerProfiles = getPlayerProfiles(
  tournaments,
  cashGames,
  "2026-08-14",
);
const duplicateBadgeProfile = testPlayerProfiles.find((profile) =>
  profile.badges
    .filter((badge) => badge.kind === "cash-game-winner")
    .reduce((sum, badge) => sum + badge.count, 0) > 1,
);
const monthlyChampionProfile = testPlayerProfiles.find((profile) =>
  profile.badges.some((badge) => badge.kind === "monthly-cash-leader"),
);
const tournamentChampionProfile = testPlayerProfiles.find((profile) =>
  profile.badges.some((badge) => badge.kind === "tournament-champion"),
);
const monthlyColorProfile = testPlayerProfiles.find(
  (profile) =>
    profile.monthlyProfit.some((month) => month.cashGameProfit > 0) &&
    profile.monthlyProfit.some((month) => month.cashGameProfit < 0),
);

function textContent(markup) {
  return markup
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function shortBadgeDate(date) {
  const [year, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}/${year.slice(-2)}`;
}

function assertPlayerModeTabs(html, selectedLabel) {
  const tabs = [
    ...html.matchAll(
      /<button\b(?=[^>]*role="tab")([^>]*)>([\s\S]*?)<\/button>/g,
    ),
  ];
  const labels = tabs.map((match) => textContent(match[2]));
  const selectedLabels = tabs
    .filter((match) => /aria-selected="true"/.test(match[1]))
    .map((match) => textContent(match[2]));

  for (const label of ["Overall", "Tournaments", "Cash games"]) {
    assert.ok(labels.includes(label), `Expected a ${label} player mode tab`);
  }
  assert.deepEqual(selectedLabels, [selectedLabel]);
}

function assertSelectedTabs(html, labels, selectedLabel) {
  const tabs = [
    ...html.matchAll(
      /<button\b(?=[^>]*role="tab")([^>]*)>([\s\S]*?)<\/button>/g,
    ),
  ];
  const renderedLabels = tabs.map((match) => textContent(match[2]));
  const selectedLabels = tabs
    .filter((match) => /aria-selected="true"/.test(match[1]))
    .map((match) => textContent(match[2]));

  for (const label of labels) {
    assert.ok(renderedLabels.includes(label), `Expected a ${label} tab`);
  }
  assert.deepEqual(
    selectedLabels,
    Array.isArray(selectedLabel) ? selectedLabel : [selectedLabel],
  );
}

async function render(pathname = "/") {
  return fetch(new URL(pathname, origin), {
    headers: { accept: "text/html" },
  });
}

test("server-renders the A-Town Poker home page with generated event data", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>A-Town Poker(?: · A-Town Poker)?<\/title>/i);
  assert.match(html, /<h1[^>]*>A-Town Poker<\/h1>/i);
  assert.match(html, /Last updated/i);
  assert.ok(html.includes(formatUpdatedAt(siteMetadata.lastUpdated)));
  assert.doesNotMatch(html, /The ledger behind|Good hands|Better stories/i);
  assert.doesNotMatch(html, /<footer\b/i);
  assert.ok(html.includes(latestCompletedTournament.title));
  assert.ok(html.includes(latestCompletedCashGame.title));
  assert.match(html, /Upcoming tournament/i);
  assert.match(html, /Cash specialist/i);
  assert.match(html, /Tournament king/i);
  assert.match(html, /Most volatile/i);
  assert.match(html, /Least volatile/i);
  assert.match(html, /Most average/i);
  assert.match(html, /Most badges/i);
  assert.match(html, /Highest single cash-game profit/i);
  assert.doesNotMatch(html, /Your site is taking shape|Codex is working/i);
});

test("keeps sortable standings on the dedicated standings page", async () => {
  const [cashResponse, tournamentResponse, cashEventsResponse, tournamentEventsResponse] = await Promise.all([
    render("/standings"),
    render("/standings?mode=tournaments"),
    render("/cash-games"),
    render("/tournaments"),
  ]);

  assert.equal(cashResponse.status, 200);
  assert.equal(tournamentResponse.status, 200);
  assert.equal(cashEventsResponse.status, 200);
  assert.equal(tournamentEventsResponse.status, 200);

  const [cashHtml, tournamentHtml, cashEventsHtml, tournamentEventsHtml] = await Promise.all([
    cashResponse.text(),
    tournamentResponse.text(),
    cashEventsResponse.text(),
    tournamentEventsResponse.text(),
  ]);
  assertSelectedTabs(cashHtml, ["Cash games", "Tournaments", "Overall", "Jul 2026", "Aug 2026"], ["Cash games", "Overall"]);
  assert.match(cashHtml, /Qualified/i);
  assert.match(cashHtml, /All players/i);
  assert.match(cashHtml, /Variance/i);
  assert.match(cashHtml, /at least 25% of completed cash games/i);
  assert.match(cashHtml, /standard deviation of session P\/L/i);
  assertSelectedTabs(tournamentHtml, ["Cash games", "Tournaments"], ["Tournaments", "Overall"]);
  assert.match(tournamentHtml, /Avg\. finish/i);
  assert.match(tournamentHtml, /aria-sort=/i);
  assert.doesNotMatch(cashEventsHtml, /<h2[^>]*>Standings<\/h2>/i);
  assert.doesNotMatch(tournamentEventsHtml, /<h2[^>]*>Standings<\/h2>/i);
});

test("server-renders generated tournament and cash-game detail routes", async () => {
  const [tournamentResponse, cashGameResponse] = await Promise.all([
    render(`/tournaments/${detailTournament.slug}`),
    render(`/cash-games/${latestCompletedCashGame.slug}`),
  ]);

  assert.equal(tournamentResponse.status, 200);
  assert.equal(cashGameResponse.status, 200);

  const [tournamentHtml, cashGameHtml] = await Promise.all([
    tournamentResponse.text(),
    cashGameResponse.text(),
  ]);
  assert.ok(tournamentHtml.includes(detailTournament.title));
  if (detailTournament.startTime) {
    assert.ok(tournamentHtml.includes(formatTime(detailTournament.startTime)));
  }
  assert.ok(cashGameHtml.includes(latestCompletedCashGame.title));
  assert.ok(cashGameHtml.includes(latestCompletedCashGame.players[0].name));
  const buyInTotal = latestCompletedCashGame.players.reduce(
    (sum, player) => sum + player.amountBuyIn,
    0,
  );
  const endingTotal = latestCompletedCashGame.players.reduce(
    (sum, player) => sum + player.amountAtEnd,
    0,
  );
  if (Math.round(buyInTotal * 100) !== Math.round(endingTotal * 100)) {
    assert.match(cashGameHtml, /Review needed/);
  }
});

test("tournament results place financials first and split optional elimination details", async () => {
  assert.ok(incompleteTournament);
  const response = await render(`/tournaments/${incompleteTournament.slug}`);
  assert.equal(response.status, 200);

  const html = await response.text();
  const headers = [...html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(
    (match) => textContent(match[1]),
  );
  assert.deepEqual(headers, [
    "Place",
    "Player",
    "Payout",
    "Bought in",
    "Net",
    "Level",
    "Out at",
    "By",
  ]);
  const resultsTable = html.match(/<table\b[\s\S]*?<\/table>/i);
  assert.ok(resultsTable);
  assert.match(resultsTable[0], /<colgroup>/i);
  assert.doesNotMatch(resultsTable[0], /\btext-(?:right|center)\b/);
  assert.doesNotMatch(html, /Elimination details/i);
  assert.doesNotMatch(html, /<th[^>]*>Round<\/th>/i);
  assert.match(html, /—/);
});

test("server-renders player mode controls and selects modes from the query string", async () => {
  const [playersResponse, tournamentPlayersResponse] = await Promise.all([
    render("/players"),
    render("/players?mode=tournaments"),
  ]);

  assert.equal(playersResponse.status, 200);
  assert.equal(tournamentPlayersResponse.status, 200);

  const [playersHtml, tournamentPlayersHtml] = await Promise.all([
    playersResponse.text(),
    tournamentPlayersResponse.text(),
  ]);
  assertPlayerModeTabs(playersHtml, "Cash games");
  assert.match(playersHtml, /<h1[^>]*>Players<\/h1>/i);
  assert.match(playersHtml, /Average P\/L/i);
  if (tournamentOnlyPlayerName) {
    const visiblePlayerNames = [
      ...playersHtml.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g),
    ].map((match) => textContent(match[1]));
    assert.ok(
      !visiblePlayerNames.includes(tournamentOnlyPlayerName),
      "Cash-game mode should hide players without cash-game results",
    );
  }

  assertPlayerModeTabs(tournamentPlayersHtml, "Tournaments");
  assert.match(tournamentPlayersHtml, /<h1[^>]*>Players<\/h1>/i);
  assert.match(tournamentPlayersHtml, /top 3/i);
});

test("server-renders a mixed-format player with overall and cash-game views", async () => {
  const [overallResponse, cashGameResponse] = await Promise.all([
    render(`/players/${mixedFormatPlayerSlug}`),
    render(`/players/${mixedFormatPlayerSlug}?mode=cash-games`),
  ]);

  assert.equal(overallResponse.status, 200);
  assert.equal(cashGameResponse.status, 200);

  const [overallHtml, cashGameHtml] = await Promise.all([
    overallResponse.text(),
    cashGameResponse.text(),
  ]);
  assertPlayerModeTabs(overallHtml, "Overall");
  assert.ok(overallHtml.includes(mixedFormatPlayerName));
  assert.match(overallHtml, /Event history/i);
  assert.match(overallHtml, /Net over time/i);
  assert.match(overallHtml, /Monthly results/i);
  assert.match(overallHtml, /Finish percentile/i);
  assert.match(overallHtml, /Trophy case/i);
  assert.match(overallHtml, /badge/i);

  assertPlayerModeTabs(cashGameHtml, "Cash games");
  assert.ok(cashGameHtml.includes(mixedFormatPlayerName));
  assert.match(cashGameHtml, /Cash game stats/i);
  assert.match(cashGameHtml, /Cash[- ]game history/i);
  assert.match(cashGameHtml, /Net over time/i);
  assert.match(cashGameHtml, /Session P\/L/i);
  assert.match(cashGameHtml, /Last 10/i);
  assert.match(cashGameHtml, /Monthly results/i);
  assert.ok(cashGameHtml.includes(mixedPlayerCashGame.title));
  assert.doesNotMatch(cashGameHtml, /Tournament stats/i);
  assert.doesNotMatch(cashGameHtml, /Tournament history/i);
  assert.doesNotMatch(cashGameHtml, /Finish percentile/i);
});

test("renders every duplicate trophy as its own hover-labeled icon", async () => {
  assert.ok(duplicateBadgeProfile);
  const cashWinnerBadges = duplicateBadgeProfile.badges.filter(
    (badge) => badge.kind === "cash-game-winner",
  );
  const cashWinnerCount = cashWinnerBadges.reduce(
    (sum, badge) => sum + badge.count,
    0,
  );
  assert.ok(cashWinnerCount > 1);

  const response = await render(`/players/${duplicateBadgeProfile.slug}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  const presentationLabel = "Cash Game Winner";
  assert.equal(
    [...html.matchAll(new RegExp(`title="${presentationLabel} —`, "g"))]
      .length,
    cashWinnerCount,
  );
  for (const badge of cashWinnerBadges) {
    assert.ok(badge.eventDate);
    assert.ok(html.includes(`>${shortBadgeDate(badge.eventDate)}</span>`));
  }
  if (duplicateBadgeProfile.name === "Sofia M.") {
    assert.match(html, /title="4-game cash win streak:/i);
    assert.equal(
      [...textContent(html).matchAll(/Cash Game Streak/g)].length,
      1,
    );
  }
  assert.equal(
    [...textContent(html).matchAll(new RegExp(presentationLabel, "g"))].length,
    1,
  );
});

test("renders dated tournament and monthly champion medallions", async () => {
  assert.ok(tournamentChampionProfile);
  assert.ok(monthlyChampionProfile);
  const tournamentBadge = tournamentChampionProfile.badges.find(
    (badge) => badge.kind === "tournament-champion",
  );
  const monthlyBadge = monthlyChampionProfile.badges.find(
    (badge) => badge.kind === "monthly-cash-leader",
  );
  assert.ok(tournamentBadge?.eventDate);
  assert.equal(monthlyBadge?.period, "2026-07");

  const [tournamentResponse, monthlyResponse] = await Promise.all([
    render(`/players/${tournamentChampionProfile.slug}`),
    render(`/players/${monthlyChampionProfile.slug}`),
  ]);
  assert.equal(tournamentResponse.status, 200);
  assert.equal(monthlyResponse.status, 200);
  const [tournamentHtml, monthlyHtml] = await Promise.all([
    tournamentResponse.text(),
    monthlyResponse.text(),
  ]);

  assert.ok(
    tournamentHtml.includes(
      `title="Tournament Gold — ${formatDate(tournamentBadge.eventDate)}:`,
    ),
  );
  assert.ok(
    tournamentHtml.includes(`>${shortBadgeDate(tournamentBadge.eventDate)}</span>`),
  );
  assert.match(monthlyHtml, /title="July 2026 Monthly Champion:/);
  assert.match(monthlyHtml, />JUL<\/span>/);
  assert.match(monthlyHtml, />26<\/span>/);
  assert.equal(
    [...textContent(monthlyHtml).matchAll(/Monthly Champion/g)].length,
    1,
  );
  assert.match(monthlyHtml, /bg-gradient-to-br p-\[3px\]/);
  assert.match(monthlyHtml, /ring-black\/30/);
});

test("uses solid site colors for positive and negative monthly results", async () => {
  assert.ok(monthlyColorProfile);
  const response = await render(
    `/players/${monthlyColorProfile.slug}?mode=cash-games`,
  );
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /bg-positive text-white/);
  assert.match(html, /bg-negative text-white/);
});
