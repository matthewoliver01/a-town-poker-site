import { cn } from "@/lib/utils";

const palette = [
  "bg-[#dcebe2] text-[#184d39]",
  "bg-[#f0e5c9] text-[#6e4d14]",
  "bg-[#e2e6ee] text-[#344a6b]",
  "bg-[#eadfdf] text-[#77403d]",
  "bg-[#e5e0ec] text-[#59436f]",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function colorFor(name: string) {
  const value = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[value % palette.length];
}

interface PlayerAvatarProps {
  name: string;
  className?: string;
}

export function PlayerAvatar({ name, className }: PlayerAvatarProps) {
  return (
    <span
      className={cn(
        "inline-grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold tracking-tight",
        colorFor(name),
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
