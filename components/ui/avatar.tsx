"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="avatar"
    className={cn(
      "relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ComponentPropsWithoutRef<"img">
>(({ className, onError, src, ...props }, ref) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => setHasError(false), [src]);

  if (!src || hasError) return null;

  return (
    // This primitive intentionally accepts a normal image URL, including local data files.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      data-slot="avatar-image"
      className={cn("relative z-10 aspect-square size-full object-cover", className)}
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="avatar-fallback"
    className={cn(
      "absolute inset-0 flex size-full items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarFallback, AvatarImage };
