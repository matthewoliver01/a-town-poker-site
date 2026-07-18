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

1. Edit `data/source/a-town-poker-results.xlsx`.
2. Keep the existing sheet names and column headings.
3. Run `npm run update-data`.
4. Review and commit the workbook plus the generated files in `data/`.

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
