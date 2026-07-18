import type { ReactNode } from "react";

interface PageIntroProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageIntro({ title, description, action }: PageIntroProps) {
  return (
    <div className="flex flex-col gap-4 border-b pb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
