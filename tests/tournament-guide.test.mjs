import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getTournamentGuide, parseTournamentGuide } from "../lib/tournament-guide.ts";

globalThis.React = React;

const { TournamentMarkdown } = await import("../components/tournament-markdown.tsx");
const { UpcomingTournament } = await import("../components/upcoming-tournament.tsx");

const upcomingTournament = {
  id: "tournament-2026-10-10",
  slug: "october-tournament",
  title: "October Tournament",
  date: "2026-10-10",
  status: "upcoming",
  host: "Matt O.",
  startTime: "18:30",
  initialBuyIn: 50,
  players: [],
  blindSchedule: [
    { level: "1", duration: 30, smallBlind: 0.25, bigBlind: 0.5 },
    { level: "Break", duration: 10 },
  ],
};

function renderMarkdown(markdown) {
  return renderToStaticMarkup(React.createElement(TournamentMarkdown, null, markdown));
}

async function fixtureDirectory(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "a-town-tournament-guide-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("tournament guides preserve introductions and ordered editable sections", () => {
  const guide = parseTournamentGuide([
    "Welcome to the tournament.",
    "",
    "## Logistics",
    "Please RSVP before the event.",
    "",
    "## Rules",
    "- One player per hand.",
    "- Keep chips visible.",
  ].join("\n"));

  assert.equal(guide.intro, "Welcome to the tournament.");
  assert.deepEqual(guide.sections.map(({ id, title }) => ({ id, title })), [
    { id: "tournament-info-logistics", title: "Logistics" },
    { id: "tournament-info-rules", title: "Rules" },
  ]);
  assert.equal(guide.sections[0].markdown, "Please RSVP before the event.");
  assert.match(guide.sections[1].markdown, /- Keep chips visible\./);
});

test("a guide without section headings still displays its complete content", () => {
  const markdown = "A brief tournament note.\n\n**Please RSVP.**";
  assert.deepEqual(parseTournamentGuide(markdown), { intro: markdown, sections: [] });
});

test("empty files, comments, definitions, and empty sections do not create blank cards", () => {
  for (const markdown of [
    "",
    " \n\t ",
    "<!-- Editor instructions only. -->",
    "[invite]: https://example.com/invite",
    "## Rules\n\n<!-- Add rules here. -->\n\n## Logistics\n",
  ]) {
    assert.equal(parseTournamentGuide(markdown), null, markdown);
  }

  const guide = parseTournamentGuide("## Empty\n<!-- Not published. -->\n\n## Rules\nKeep chips visible.");
  assert.deepEqual(guide.sections.map(({ title }) => title), ["Rules"]);
});

test("section parsing normalizes BOM and Windows line endings", () => {
  const guide = parseTournamentGuide("\uFEFFIntro.\r\n\r\n## Logistics\r\nBring chips.\r\n");
  assert.equal(guide.intro, "Intro.");
  assert.equal(guide.sections[0].markdown, "Bring chips.");
  assert.doesNotMatch(JSON.stringify(guide), /\\r|\uFEFF/);
});

test("only document-level H2 headings create sections", () => {
  const guide = parseTournamentGuide([
    "## Logistics",
    "```markdown",
    "## Not a section",
    "```",
    "",
    "> ## Quoted heading",
    "> Quoted details.",
    "",
    "- ## List heading",
    "  Details in a list.",
    "",
    "### Arrival",
    "Please arrive on time.",
    "",
    "## Rules",
    "Keep chips visible.",
  ].join("\n"));

  assert.deepEqual(guide.sections.map(({ title }) => title), ["Logistics", "Rules"]);
  assert.match(guide.sections[0].markdown, /## Not a section/);
  assert.match(guide.sections[0].markdown, /> ## Quoted heading/);
  assert.match(guide.sections[0].markdown, /- ## List heading/);
  assert.match(guide.sections[0].markdown, /### Arrival/);
});

test("section anchors remain unique and separate from built-in player and blind anchors", () => {
  const guide = parseTournamentGuide([
    "## **Rules**",
    "First rules.",
    "## Rules",
    "More rules.",
    "## Rulés",
    "Additional rules.",
    "## Players",
    "Player details.",
    "## Blind schedule",
    "Blind details.",
    "## 🎲",
    "Other details.",
  ].join("\n"));

  assert.equal(guide.sections[0].title, "Rules");
  assert.deepEqual(guide.sections.map(({ id }) => id), [
    "tournament-info-rules",
    "tournament-info-rules-2",
    "tournament-info-rules-3",
    "tournament-info-players",
    "tournament-info-blind-schedule",
    "tournament-info-details",
  ]);
});

test("reference links resolve in introductions and across separately rendered sections", () => {
  const guide = parseTournamentGuide([
    "Use the [invitation][invite].",
    "",
    "## Logistics",
    "[RSVP][invite] before the event.",
    "",
    "## Rules",
    "Read the [house rules][rules].",
    "",
    "[invite]: https://example.com/invitation",
    "[rules]: https://example.com/rules",
  ].join("\n"));

  assert.match(renderMarkdown(guide.intro), /href="https:\/\/example\.com\/invitation"/);
  assert.match(renderMarkdown(guide.sections[0].markdown), /href="https:\/\/example\.com\/invitation"/);
  assert.match(renderMarkdown(guide.sections[1].markdown), /href="https:\/\/example\.com\/rules"/);
});

test("optional tournament guide loading reads the matching ID and tolerates missing or empty files", async (t) => {
  const directory = await fixtureDirectory(t);
  await writeFile(path.join(directory, "tournament-2026-10-10.md"), "## Rules\nKeep chips visible.");
  await writeFile(path.join(directory, "tournament-empty.md"), "<!-- Draft only. -->");

  const guide = await getTournamentGuide("tournament-2026-10-10", directory);
  assert.equal(guide.sections[0].title, "Rules");
  assert.equal(guide.sections[0].markdown, "Keep chips visible.");
  assert.equal(await getTournamentGuide("tournament-missing", directory), null);
  assert.equal(await getTournamentGuide("tournament-empty", directory), null);
});

test("invalid tournament IDs cannot escape the guide directory", async (t) => {
  const directory = await fixtureDirectory(t);
  const contentDirectory = path.join(directory, "guides");
  await mkdir(contentDirectory);
  await writeFile(path.join(directory, "outside.md"), "## Rules\nDo not load this file.");

  for (const id of ["", ".", "..", "../outside", "../../outside", "nested/file", "nested\\file", "/outside", "two words", "%2e%2e%2foutside"]) {
    assert.equal(await getTournamentGuide(id, contentDirectory), null, id);
  }
});

test("guide loading does not silently hide filesystem errors other than a missing file", async (t) => {
  const directory = await fixtureDirectory(t);
  await mkdir(path.join(directory, "tournament-directory.md"));
  await assert.rejects(getTournamentGuide("tournament-directory", directory), { code: "EISDIR" });
});

test("tournament Markdown renders ordinary formatting and scrollable GFM tables", () => {
  const html = renderMarkdown([
    "### Arrival",
    "Please **RSVP** and bring *chips*.",
    "",
    "- First item",
    "- Second item",
    "",
    "3. Third item",
    "4. Fourth item",
    "",
    "| Rule | Detail |",
    "| --- | --- |",
    "| Chips | Keep visible |",
    "",
    "[Invitation](https://example.com/invite)",
  ].join("\n"));

  assert.match(html, /<h3\b[^>]*>Arrival<\/h3>/);
  assert.match(html, /<strong\b[^>]*>RSVP<\/strong>/);
  assert.match(html, /<em>chips<\/em>/);
  assert.match(html, /<ul\b/);
  assert.match(html, /<ol\b[^>]*start="3"/);
  assert.match(html, /overflow-x-auto/);
  assert.match(html, /<table\b/);
  assert.match(html, /<th\b[^>]*>Rule<\/th>/);
  assert.match(html, /<td\b[^>]*>Keep visible<\/td>/);
  assert.match(html, /href="https:\/\/example\.com\/invite"/);
});

test("tournament Markdown does not execute raw HTML or unsafe links", () => {
  const html = renderMarkdown([
    "Safe text.",
    "",
    "<script>alert('unsafe')</script>",
    "",
    "<iframe src=\"https://example.com\"></iframe>",
    "",
    "<img src=\"bad\" onerror=\"alert('unsafe')\" />",
    "",
    "[Unsafe](javascript:alert%281%29)",
    "",
    "![Unsafe image](javascript:alert%281%29)",
    "",
    "[Email](mailto:host@example.com)",
  ].join("\n"));

  assert.match(html, /Safe text\./);
  assert.doesNotMatch(html, /<script\b|<iframe\b|\bonerror=/i);
  assert.doesNotMatch(html, /(?:href|src)="javascript:/i);
  assert.match(html, /href="mailto:host@example\.com"/);
});

test("Markdown images remain compact and preserve their aspect ratio", () => {
  const html = renderMarkdown('![Final table](/photos/final-table.jpg "Tournament photo")');
  assert.match(html, /src="\/photos\/final-table\.jpg"/);
  assert.match(html, /alt="Final table"/);
  assert.match(html, /title="Tournament photo"/);
  assert.match(html, /max-w-sm/);
  assert.match(html, /h-auto/);
  assert.match(html, /object-contain/);
});

test("upcoming tournament sections follow Markdown order and navigation points to each section", () => {
  const guide = parseTournamentGuide([
    "An introduction to this event.",
    "",
    "## Logistics",
    "Please RSVP.",
    "",
    "## Rules",
    "Keep chips visible.",
    "",
    "## Payouts",
    "Payout details will be posted here.",
  ].join("\n"));
  const html = renderToStaticMarkup(React.createElement(UpcomingTournament, {
    tournament: upcomingTournament,
    guide,
    announcements: [],
  }));
  const expectedSections = [
    "tournament-info",
    "tournament-info-logistics",
    "tournament-info-rules",
    "tournament-info-payouts",
    "registered-players",
    "blind-schedule",
  ];
  const navigation = html.match(/<nav\b[^>]*aria-label="Tournament sections"[\s\S]*?<\/nav>/)?.[0];

  assert.ok(navigation);
  assert.deepEqual([...navigation.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]), expectedSections);
  assert.deepEqual([...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]), expectedSections);
  assert.match(html, /An introduction to this event\./);
  for (const section of guide.sections) {
    assert.ok(html.includes(`id="${section.id}-heading"`));
    assert.match(html, new RegExp(`<h2\\b[^>]*>${section.title}<\\/h2>`));
  }
  assert.match(html, /No players registered yet\./);
  assert.match(html, /aria-label="0 registered players"/);
  assert.match(html, /6:30 PM/);
  assert.match(html, /Total estimated time/);
  assert.match(html, />40 min</);
});

test("upcoming guides preserve all Excel details, registered players, and the final blind schedule", () => {
  const tournament = {
    ...upcomingTournament,
    notes: "Workbook notes remain available.",
    photos: [{ src: "/photos/upcoming.jpg", caption: "Tournament setup" }],
    players: [
      { name: "Sophia S.", totalBuyIn: 100 },
      { name: "Matt O.", totalBuyIn: 50 },
    ],
  };
  const html = renderToStaticMarkup(React.createElement(UpcomingTournament, {
    tournament,
    guide: parseTournamentGuide("## Rules\nGuide rules remain available too."),
    announcements: [{
      id: "event-update",
      date: "2026-09-27",
      title: "Event announcement",
      body: "Please confirm your RSVP.",
      pinned: true,
    }],
  }));

  assert.match(html, /October Tournament/);
  assert.match(html, /Guide rules remain available too\./);
  assert.match(html, /Workbook notes remain available\./);
  assert.match(html, /src="\/photos\/upcoming\.jpg"/);
  assert.match(html, /Tournament setup/);
  assert.match(html, /Event announcement/);
  assert.match(html, /Please confirm your RSVP\./);
  assert.match(html, /Sophia S\./);
  assert.match(html, /Matt O\./);
  assert.match(html, /Buy-in: \$100/);
  assert.match(html, /Buy-in: \$50/);
  assert.match(html, /Total buy-ins:[\s\S]*?>\$150</);
  assert.match(html, /aria-label="2 registered players"/);
  assert.match(html, /href="#event-details"/);
  const sections = [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sections, ["tournament-info-rules", "event-details", "registered-players", "blind-schedule"]);
  assert.ok(html.indexOf('id="registered-players"') < html.indexOf('id="blind-schedule"'));
  assert.doesNotMatch(html.slice(html.indexOf('id="blind-schedule"') + 1), /<section\b/);
});

test("upcoming pages work without a Markdown file and keep workbook notes as their fallback", () => {
  const html = renderToStaticMarkup(React.createElement(UpcomingTournament, {
    tournament: { ...upcomingTournament, notes: "Details entered in Excel." },
    guide: null,
    announcements: [],
  }));

  assert.match(html, /Details entered in Excel\./);
  assert.match(html, /No players registered yet\./);
  assert.match(html, /href="#event-details"/);
  assert.match(html, /href="#registered-players"/);
  assert.match(html, /href="#blind-schedule"/);
  assert.doesNotMatch(html, /id="tournament-info/);
  assert.doesNotMatch(html, /href="#tournament-info/);
  assert.doesNotMatch(html, /Total buy-ins:/);
});

test("upcoming pages omit unavailable optional sections and their navigation links", () => {
  const html = renderToStaticMarkup(React.createElement(UpcomingTournament, {
    tournament: { ...upcomingTournament, blindSchedule: [] },
    guide: null,
    announcements: [],
  }));

  assert.match(html, /No players registered yet\./);
  assert.match(html, /href="#registered-players"/);
  assert.doesNotMatch(html, /id="event-details"|href="#event-details"/);
  assert.doesNotMatch(html, /id="blind-schedule"|href="#blind-schedule"/);
  assert.doesNotMatch(html, /Total estimated time/);
});
