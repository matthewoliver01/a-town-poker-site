# A-Town Poker data source

`a-town-poker-results.xlsx` is the editable source of truth for tournament and
cash-game data. The JSON files in `data/` are generated from this workbook.

## Everyday workflow

1. Edit `a-town-poker-results.xlsx` and save it.
2. From the project folder, run `npm run update-data`.
3. When the command reports success, `data/tournaments.json` and
   `data/cash-games.json` are ready for the site.

Keep the worksheet names and column headers unchanged. A result row containing
only an event ID is treated as a draft and skipped with a warning. Any other
unfinished or invalid row stops the conversion, identifies the worksheet and
row, and leaves the last good JSON untouched.

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
unique IDs and slugs, tournament balances, cent-level amounts, and upcoming-event
rules before writing either JSON file. Cash-game differences remain visible through
the site's ledger check instead of blocking conversion.
