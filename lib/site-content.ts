import type { SiteAnnouncement } from "@/lib/poker-types";

export function currentEasternDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function isAnnouncementActive(
  announcement: SiteAnnouncement,
  today = currentEasternDate(),
) {
  return (
    announcement.date <= today &&
    (!announcement.expires || announcement.expires >= today)
  );
}
