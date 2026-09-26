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

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function isOlderThanOneYear(date: Date) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return date < oneYearAgo;
}
