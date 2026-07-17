"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TabsOrientation = "horizontal" | "vertical";
type TabsActivationMode = "automatic" | "manual";

type TabsContextValue = {
  activationMode: TabsActivationMode;
  baseId: string;
  onValueChange: (value: string) => void;
  orientation: TabsOrientation;
  value: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error(`${component} must be used within <Tabs>.`);
  }

  return context;
}

type TabsProps = Omit<React.ComponentPropsWithoutRef<"div">, "defaultValue"> & {
  activationMode?: TabsActivationMode;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;
  value?: string;
};

function Tabs({
  activationMode = "automatic",
  className,
  defaultValue = "",
  onValueChange,
  orientation = "horizontal",
  value: controlledValue,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] =
    React.useState(defaultValue);
  const generatedId = React.useId();
  const value = controlledValue ?? uncontrolledValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (controlledValue === undefined) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [controlledValue, onValueChange],
  );

  const context = React.useMemo<TabsContextValue>(
    () => ({
      activationMode,
      baseId: generatedId,
      onValueChange: setValue,
      orientation,
      value,
    }),
    [activationMode, generatedId, orientation, setValue, value],
  );

  return (
    <TabsContext.Provider value={context}>
      <div
        data-slot="tabs"
        data-orientation={orientation}
        className={cn("flex gap-4", orientation === "vertical" ? "flex-row" : "flex-col", className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, onKeyDown, ...props }, ref) => {
  const { activationMode, orientation } = useTabsContext("TabsList");

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const isNext =
      (orientation === "horizontal" && event.key === "ArrowRight") ||
      (orientation === "vertical" && event.key === "ArrowDown");
    const isPrevious =
      (orientation === "horizontal" && event.key === "ArrowLeft") ||
      (orientation === "vertical" && event.key === "ArrowUp");

    if (!isNext && !isPrevious && event.key !== "Home" && event.key !== "End") {
      return;
    }

    const triggers = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)',
      ),
    );
    const currentIndex = triggers.indexOf(
      document.activeElement as HTMLButtonElement,
    );

    if (!triggers.length) return;

    event.preventDefault();
    let nextIndex = currentIndex < 0 ? 0 : currentIndex;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = triggers.length - 1;
    if (isNext) nextIndex = (nextIndex + 1) % triggers.length;
    if (isPrevious) nextIndex = (nextIndex - 1 + triggers.length) % triggers.length;

    triggers[nextIndex]?.focus();
    if (activationMode === "automatic") triggers[nextIndex]?.click();
  }

  return (
    <div
      ref={ref}
      role="tablist"
      aria-orientation={orientation}
      data-slot="tabs-list"
      data-orientation={orientation}
      className={cn(
        "inline-flex w-fit items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground",
        orientation === "vertical" && "flex-col items-stretch",
        className,
      )}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
});
TabsList.displayName = "TabsList";

type TabsTriggerProps = React.ComponentPropsWithoutRef<"button"> & {
  value: string;
};

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, onClick, value, ...props }, ref) => {
    const context = useTabsContext("TabsTrigger");
    const isActive = context.value === value;
    const encodedValue = encodeURIComponent(value);

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={`${context.baseId}-tab-${encodedValue}`}
        aria-controls={`${context.baseId}-panel-${encodedValue}`}
        aria-selected={isActive}
        data-slot="tabs-trigger"
        data-state={isActive ? "active" : "inactive"}
        tabIndex={isActive ? 0 : -1}
        className={cn(
          "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:size-4",
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) context.onValueChange(value);
        }}
        {...props}
      />
    );
  },
);
TabsTrigger.displayName = "TabsTrigger";

type TabsContentProps = React.ComponentPropsWithoutRef<"div"> & {
  value: string;
};

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const context = useTabsContext("TabsContent");
    const isActive = context.value === value;
    const encodedValue = encodeURIComponent(value);

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`${context.baseId}-panel-${encodedValue}`}
        aria-labelledby={`${context.baseId}-tab-${encodedValue}`}
        data-slot="tabs-content"
        data-state={isActive ? "active" : "inactive"}
        tabIndex={0}
        hidden={!isActive}
        className={cn(
          "min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        {...props}
      />
    );
  },
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsContent, TabsList, TabsTrigger };
export type { TabsContentProps, TabsProps, TabsTriggerProps };
