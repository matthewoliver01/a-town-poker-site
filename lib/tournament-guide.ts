import { readFile } from "node:fs/promises";
import path from "node:path";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export interface TournamentGuideSection {
  id: string;
  title: string;
  markdown: string;
}

export interface TournamentGuide {
  intro: string;
  sections: TournamentGuideSection[];
}

const parser = unified().use(remarkParse).use(remarkGfm);

/** Only document-level ## headings create sections; headings in code/lists do not. */
export function parseTournamentGuide(source: string): TournamentGuide | null {
  const markdown = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const document = parser.parse(markdown);
  if (!document.children.some((node) => node.type !== "html" && node.type !== "definition")) return null;

  const headings = document.children.filter((node) => node.type === "heading" && node.depth === 2);
  // Reference-style links can be defined anywhere in the file, across sections.
  const definitions = document.children
    .filter((node) => node.type === "definition")
    .map((node) => markdown.slice(node.position?.start.offset, node.position?.end.offset))
    .join("\n");
  const withDefinitions = (text: string) => definitions ? `${text}\n\n${definitions}` : text;
  const hasContent = (text: string) => parser.parse(text).children.some(
    (node) => node.type !== "html" && node.type !== "definition",
  );
  const usedIds = new Set<string>();
  const sections: TournamentGuideSection[] = [];

  headings.forEach((heading, index) => {
    const body = markdown.slice(heading.position?.end.offset, headings[index + 1]?.position?.start.offset).trim();
    if (!hasContent(body)) return;
    const title = toString(heading).trim() || "Details";
    const baseId = `tournament-info-${title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "details"}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    sections.push({ id, title, markdown: withDefinitions(body) });
  });

  const intro = markdown.slice(0, headings[0]?.position?.start.offset).trim();
  const visibleIntro = hasContent(intro) ? withDefinitions(intro) : "";
  return visibleIntro || sections.length ? { intro: visibleIntro, sections } : null;
}

/** Optional companion content, independent of the workbook-to-JSON pipeline. */
export async function getTournamentGuide(
  tournamentId: string,
  directory = path.join(process.cwd(), "content", "tournaments"),
): Promise<TournamentGuide | null> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(tournamentId)) return null;
  try {
    return parseTournamentGuide(await readFile(path.join(directory, `${tournamentId}.md`), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
