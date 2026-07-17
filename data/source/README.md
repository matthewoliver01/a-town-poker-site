# A-Town Poker data source

`a-town-poker-results.xlsx` is the editable source of truth for tournament and
cash-game data. The JSON files in `data/` are generated from this workbook.

- Edit the workbook, not the generated JSON.
- Keep the worksheet names and column headers unchanged.
- Run `npm run data:generate` after saving, or run the normal site build.
- Run `npm run data:check` to verify that the committed JSON matches the workbook.

The converter validates required fields, event/player references, tie placements,
unique IDs and slugs, tournament balances, cent-level amounts, and upcoming-event
rules before writing either JSON file. Cash-game differences remain visible through
the site's ledger check instead of blocking conversion.
