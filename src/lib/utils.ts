export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Extract year/month from a date string via string-slicing to avoid timezone issues */
export function getDateSegments(dateStr: string | Date) {
  const str =
    typeof dateStr === "string" ? dateStr : dateStr.toISOString().slice(0, 10);
  const [year, month] = str.split("-");
  return { year, month };
}

export function getBlogUrl(id: string, publishedAt: string | Date) {
  const { year, month } = getDateSegments(publishedAt);
  return `/blog/${year}/${month}/${id}/`;
}

export function getProjectUrl(id: string) {
  return `/projects/${id}/`;
}

export function getLabUrl(id: string) {
  return `/lab/${id}/`;
}

export function formatDate(date: Date) {
  // Content dates are UTC midnight, so the shown day must not depend on the build machine's zone.
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Text cut to at most `max` characters, at a word when there is one, with an
 * ellipsis. Counts code points, so an emoji or other astral character is never split.
 */
export function truncate(text: string, max: number) {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const cut = chars.slice(0, max).join("");
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, "")}…`;
}

export function isOlderThanOneYear(date: Date) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return date < oneYearAgo;
}
