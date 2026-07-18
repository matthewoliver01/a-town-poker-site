import Link from "next/link";

interface SectionHeadingProps {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}

export function SectionHeading({ title, description, href, linkLabel }: SectionHeadingProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="inline-flex shrink-0 text-sm font-semibold text-primary hover:underline"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
