# Tournament information

Use one Markdown (`.md`) file per upcoming tournament for logistics, rules,
rebuy policies, payouts, and other written details. Excel still controls dates,
hosts, buy-ins, registered players, results, photos, blind schedules, notes,
and announcements. No workbook changes are required.

## Edit the October tournament

Open `tournament-2026-10-10.md` in this folder. Edit the text and save it.
The RSVP text comes from the existing announcement; replace the rules
placeholder with your actual rules when you are ready.

With `npm run dev` running, refresh the tournament page to see changes.
Markdown edits **do not need `npm run update-data`** and that command never
overwrites these files. The site's “Last updated” timestamp continues to track
the workbook conversion, as before.

For the live site, commit the Markdown file along with your other changes,
then rebuild/deploy to AWS as usual. Markdown is rendered during the site build;
editing a local file alone does not update the deployed site.

## Add information for another tournament

1. Create the tournament in Excel and run `npm run update-data`, as usual.
2. Copy `_template.md` into this same folder.
3. Name the copy **exactly** `<Tournament ID>.md`, using the ID in Excel's
   `Tournaments` sheet. For example, `tournament-2026-10-10.md`.
   Use the ID, not the title or URL slug. IDs are case-sensitive.
4. Replace the template text with your information. Delete anything you do not
   need. The template itself is never displayed on the site.

An ID matches the file, so changing a title, date, or URL slug does not require
renaming the file. If you change the actual Tournament ID, rename the file too.

## Formatting

Each `## Heading` becomes a separate section and a jump link. Sections appear
in the order you write them. Add as many as you need; there is no fixed list.
Use `###` for a smaller heading inside a section. An optional opening paragraph
before the first `##` is shown as an overview.

```md
Optional short overview of this tournament.

## Logistics

Please **RSVP** before the event. Contact the host for an invitation.

- Arrival instructions go here.
- Add food, parking, or what-to-bring details.

## Rules

1. First house rule.
2. Second house rule.

### Rebuys

Explain the rebuy policy here.

## Payouts

Explain how payouts will be decided.

## Links

[Invitation](https://example.com)
```

- Separate paragraphs with a blank line.
- Use `**bold**`, `*italic*`, numbered lists, or bullet lists for emphasis.
- Links, checklists, and Markdown tables are supported.
- Put editor-only reminders in `<!-- comments like this -->`.
- An empty section, or a section containing only comments, is hidden.
- Raw HTML and executable content are not supported.
- Keep structured values such as start times and blinds in Excel so they do not
  have to be maintained in two places.

## What stays the same

Excel notes, announcements, and photos remain visible alongside Markdown.
Registered players still come from Excel, including an empty list when nobody
has registered. The blind schedule remains the last section on the page.

If a Markdown file is missing or empty, the event still works normally with its
Excel information. The new layout is only for `upcoming` tournaments. When you
mark a tournament `completed`, it returns to the results layout; its Markdown
file stays on disk but is no longer displayed. Historical results and cash-game
pages are unchanged.
