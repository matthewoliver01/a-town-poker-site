import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

globalThis.React = React;

const { EventDetailContent } = await import(
  "../components/event-detail-content.tsx"
);
const { TournamentCard } = await import("../components/event-cards.tsx");

test("event announcements sit directly in the outer card", () => {
  const html = renderToStaticMarkup(
    React.createElement(EventDetailContent, {
      eventTitle: "October Tournament",
      announcements: [
        {
          id: "save-the-date",
          date: "2026-08-02",
          title: "Save the date",
          body: "Tournament details go here.",
          pinned: true,
        },
      ],
    }),
  );

  const article = html.match(/<article\b[^>]*>/i)?.[0];
  assert.ok(article);
  assert.doesNotMatch(article, /\b(?:rounded|border|bg-)/);
  assert.doesNotMatch(html, /data-slot="badge"/);
  assert.match(html, /Save the date/);
  assert.match(html, /Tournament details go here\./);
});

test("event photos use a compact 4:3 container without cropping", () => {
  const html = renderToStaticMarkup(
    React.createElement(EventDetailContent, {
      eventTitle: "October Tournament",
      photos: [{ src: "/photos/tournament.jpg", caption: "Final table" }],
    }),
  );

  assert.match(html, /max-w-xl/);
  assert.match(html, /aspect-\[4\/3\]/);
  assert.match(html, /object-contain/);
});

test("upcoming-card announcements have no quote-style rule or indentation", () => {
  const html = renderToStaticMarkup(
    React.createElement(TournamentCard, {
      tournament: {
        id: "tournament-2026-10-10",
        slug: "tournament-2026-10-10",
        title: "October Tournament",
        date: "2026-10-10",
        host: "Matt O.",
        venue: "Matt's House",
        status: "upcoming",
        startTime: "18:30",
        initialBuyIn: 50,
        players: [],
      },
      announcement: {
        title: "Save the date",
        body: "Tournament details go here.",
      },
    }),
  );

  assert.match(html, /Save the date/);
  assert.doesNotMatch(html, /border-l-2|\bpl-3\b/);
});
