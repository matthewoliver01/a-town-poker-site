import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown only: no raw HTML, scripts, embedded frames, or executable MDX. */
export function TournamentMarkdown({ children }: { children: string }) {
  return (
    <div className="tournament-markdown min-w-0 break-words text-sm leading-7 text-muted-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => <h3 className="mb-3 mt-6 text-lg font-semibold text-foreground">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-3 mt-6 text-lg font-semibold text-foreground">{children}</h3>,
          h3: ({ children }) => <h3 className="mb-2 mt-5 font-semibold text-foreground">{children}</h3>,
          h4: ({ children }) => <h4 className="mb-2 mt-4 font-semibold text-foreground">{children}</h4>,
          p: ({ children }) => <p className="my-3">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5 marker:text-primary">{children}</ul>,
          ol: ({ children, start }) => <ol start={start} className="my-3 list-decimal space-y-1 pl-5 marker:font-medium marker:text-foreground">{children}</ol>,
          a: ({ children, href }) => <a href={href} className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">{children}</a>,
          blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-primary pl-4 italic">{children}</blockquote>,
          hr: () => <hr className="my-6" />,
          table: ({ children }) => <div className="my-4 max-w-full overflow-x-auto rounded-lg border"><table className="w-full min-w-80 text-left text-sm">{children}</table></div>,
          th: ({ children }) => <th className="border-b bg-muted/50 px-3 py-2 font-semibold text-foreground">{children}</th>,
          td: ({ children }) => <td className="border-b px-3 py-2">{children}</td>,
          pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs">{children}</pre>,
          code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-[0.9em] text-foreground">{children}</code>,
          // Optional inline photos never grow to their native pixel dimensions.
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt, title }) => src ? <img src={src} alt={alt ?? ""} title={title} loading="lazy" className="my-4 h-auto max-h-72 w-full max-w-sm rounded-lg object-contain" /> : null,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
