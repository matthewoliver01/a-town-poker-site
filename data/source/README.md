# A-Town Poker data source

`a-town-poker-data.xlsx` is the editable source of truth for tournament and
cash-game data. The JSON files in `data/` are generated from this workbook.
Older workbooks remain beside it as backups and are not read by the build.

## Everyday workflow

1. Edit `a-town-poker-data.xlsx` and save it.
2. From the project folder, run `npm run update-data`.
3. When the command reports success, `data/tournaments.json`,
   `data/cash-games.json`, `data/site-content.json`, and
   `data/site-metadata.json` are ready for the site. The metadata timestamp is
   the time this successful update ran and powers the header's “Last updated”
   display.

Keep the worksheet names and column headers unchanged. A result row containing
only an event ID is treated as a draft and skipped with a warning. Any other
unfinished or invalid row stops the conversion, identifies the worksheet and
row, and leaves the last good JSON untouched.

## Workbook layout

The headers stay on row 4 and data starts on row 5.

- `Tournaments`: the existing columns, followed by optional `Notes` in column J.
- `Tournament Results`: `Tournament ID`, `Player`, `Total Buy-In`, `Placement`,
  `Placement Payout`, `Bonus Payout`, followed by optional `Elimination Level`,
  `Eliminated At`, and `Eliminated By`.
- `Cash Games`: the existing columns, followed by optional `Notes` in column J.
- `Cash Game Results`: unchanged.
- `Event Photos`: `Event ID`, `Image Path`, `Caption`, `Show on Home`, `Sort Order`.
- `Announcements`: `Announcement ID`, `Date`, `Title`, `Body`, `Event ID`,
  `Expires`, `Pinned`.

`Event ID` on the last two sheets must match an ID from `Tournaments` or
`Cash Games`. Leave it blank on an announcement to make that announcement
general instead of tying it to one event. `Expires` is optional. Use `Yes` in
`Pinned` to keep an announcement ahead of other announcements.

The three elimination-detail columns are optional for every completed player,
so older tournaments can leave them empty. Enter `Eliminated At` as a normal
Excel time or text such as `9:47 PM`. Numeric blind levels and short labels are
both accepted. Missing elimination details display as dashes on the tournament
page.

Upcoming tournaments do not require any player rows. Add registrations to
`Tournament Results` only when players have signed up; an empty registration
list is valid. Completed tournaments still require at least two player rows.

## Add photos

1. Copy the image into `public/photos/`.
2. Add a row to `Event Photos`.
3. Enter either the filename (for example `july-final-table.jpg`) or the full
   public path (`/photos/july-final-table.jpg`) in `Image Path`.
4. Set `Show on Home` to `Yes` to include it in the homepage slideshow.
5. Use `Sort Order` to control the order of photos within an event.
6. Run `npm run update-data`.

An HTTPS image URL also works, but keeping the image in `public/photos/` makes
the AWS deployment self-contained. Events without photo rows keep the compact,
text-only card.

## Build and AWS workflow

The converter is a local Node.js script and does not use ChatGPT hosting. A
normal `npm run build` automatically runs it before building the site. An AWS
build pipeline therefore only needs to install dependencies and run the normal
build:

```sh
npm ci
npm run build
```

Run `npm run data:check` when a pipeline should verify that committed JSON
already matches the workbook without changing any files.

The converter validates required fields, event/player references, tie placements,
unique IDs and slugs, tournament balances, cent-level amounts, photo references,
announcement dates, and upcoming-event rules before writing any generated JSON.
Cash-game differences remain visible through the site's ledger check instead of
blocking conversion.
