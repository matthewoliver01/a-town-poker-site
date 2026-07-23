import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

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

const [tournaments, cashGames] = await Promise.all([
  readFile(new URL("../data/tournaments.json", import.meta.url), "utf8").then(
    JSON.parse,
  ),
  readFile(new URL("../data/cash-games.json", import.meta.url), "utf8").then(
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

function textContent(markup) {
  return markup
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
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
  assert.deepEqual(selectedLabels, [selectedLabel]);
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
  assert.doesNotMatch(html, /Your site is taking shape|Codex is working/i);
});

test("defaults standings to cash games and honors the tournament query", async () => {
  const [cashResponse, tournamentResponse] = await Promise.all([
    render("/standings"),
    render("/standings?mode=tournaments"),
  ]);

  assert.equal(cashResponse.status, 200);
  assert.equal(tournamentResponse.status, 200);

  const [cashHtml, tournamentHtml] = await Promise.all([
    cashResponse.text(),
    tournamentResponse.text(),
  ]);
  assertSelectedTabs(cashHtml, ["Cash games", "Tournaments"], "Cash games");
  assert.match(cashHtml, /Variance/i);
  assert.match(cashHtml, /standard deviation of session P\/L/i);
  assertSelectedTabs(
    tournamentHtml,
    ["Cash games", "Tournaments"],
    "Tournaments",
  );
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
    assert.ok(tournamentHtml.includes(detailTournament.startTime));
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
  assert.match(overallHtml, /Net by month/i);
  assert.match(overallHtml, /Finish percentile/i);

  assertPlayerModeTabs(cashGameHtml, "Cash games");
  assert.ok(cashGameHtml.includes(mixedFormatPlayerName));
  assert.match(cashGameHtml, /Cash game stats/i);
  assert.match(cashGameHtml, /Cash[- ]game history/i);
  assert.match(cashGameHtml, /Net over time/i);
  assert.match(cashGameHtml, /Net by month/i);
  assert.ok(cashGameHtml.includes(mixedPlayerCashGame.title));
  assert.doesNotMatch(cashGameHtml, /Tournament stats/i);
  assert.doesNotMatch(cashGameHtml, /Tournament history/i);
  assert.doesNotMatch(cashGameHtml, /Finish percentile/i);
});
