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
optional elimination level, level-clock time remaining, elimination time, and
eliminator fields. The `Event Photos` sheet controls event galleries and
the homepage slideshow; the `Announcements` sheet supports general posts or
posts tied to one tournament or cash game. See `data/source/README.md` for the
exact columns and examples.

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
