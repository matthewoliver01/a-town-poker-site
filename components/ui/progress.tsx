import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "children"
> & {
  max?: number;
  value?: number;
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, max = 100, value = 0, ...props }, ref) => {
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
    const safeValue = Number.isFinite(value)
      ? Math.min(Math.max(value, 0), safeMax)
      : 0;
    const percentage = (safeValue / safeMax) * 100;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        data-slot="progress"
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-primary/15",
          className,
        )}
        {...props}
      >
        <div
          data-slot="progress-indicator"
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
export type { ProgressProps };
