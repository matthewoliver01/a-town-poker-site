import assert from "node:assert/strict";
import test from "node:test";

import { isAnnouncementActive } from "../lib/site-content.ts";

const announcement = {
  id: "game-update",
  date: "2026-07-20",
  title: "Game update",
  body: "Two seats remain.",
  pinned: false,
};

test("announcement dates and expiration dates are inclusive", () => {
  assert.equal(isAnnouncementActive(announcement, "2026-07-20"), true);
  assert.equal(
    isAnnouncementActive(
      { ...announcement, expires: "2026-07-25" },
      "2026-07-25",
    ),
    true,
  );
});

test("future and expired announcements stay hidden", () => {
  assert.equal(isAnnouncementActive(announcement, "2026-07-19"), false);
  assert.equal(
    isAnnouncementActive(
      { ...announcement, expires: "2026-07-25" },
      "2026-07-26",
    ),
    false,
  );
});
