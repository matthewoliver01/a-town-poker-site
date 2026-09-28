# A-Town Poker

Results, standings, and player statistics for A-Town Poker. The site runs on
Next.js and is configured for AWS Amplify Hosting.

## Local development

Prerequisite: Node.js 22.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Update poker data

1. Edit `data/source/a-town-poker-data.xlsx`.
2. Keep the existing sheet names and column headings.
3. Put event images in `public/photos/` and reference them from the workbook's
   `Event Photos` sheet when needed.
4. Run `npm run update-data`.
5. Review and commit the workbook, images, and generated files in `data/`.

Each successful update also refreshes `data/site-metadata.json`. Its
`lastUpdated` timestamp is displayed in the site header.

The event sheets include an optional `Notes` column. Tournament results accept
optional elimination level, elimination time, and eliminator fields. The
`Event Photos` sheet controls event galleries and
the homepage slideshow; the `Announcements` sheet supports general posts or
posts tied to one tournament or cash game. See `data/source/README.md` for the
exact columns and examples.

## Upcoming tournament logistics and rules

Long-form tournament details live in `content/tournaments/<Tournament ID>.md`,
not in Excel. Each `## Heading` becomes a section on the upcoming tournament
page, with jump links, followed by the Excel-powered players and blind schedule.
Start with `content/tournaments/tournament-2026-10-10.md`, or copy `_template.md`
for a new event. Missing files are optional; completed pages stay unchanged.

Save the Markdown and refresh your local page; no `update-data` step is needed.
Commit and rebuild/deploy to publish it. Excel, its conversion script, and the
header's data-update timestamp still work exactly as before.
See [the editing guide](content/tournaments/README.md) for formatting and examples.

## Check the data

Check that the workbook and JSON match without changing files:

```bash
npm run data:check
```

## Validate

```bash
npm test
```

This creates the same `.next` production bundle used by Amplify and runs the
data, standings, placement, and rendered-page tests.

## Deploy to AWS Amplify

Amplify uses the committed `amplify.yml` file to install dependencies, build
the Next.js application, and deploy the `.next` output. Push a commit to the
branch connected to Amplify to trigger a deployment.
