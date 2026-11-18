import { createContext, useContext } from "react";

// Per-language strings for everything the video draws itself (not the script).
export type Lang = "en" | "es";

export const STRINGS: Record<
  Lang,
  {
    showName: string;
    badge: string;
    sub: string;
    tagline: string;
    locale: string;
    story: string; // kicker of the story separator
  }
> = {
  en: {
    showName: "DISTILLED",
    badge: "DISTILLED",
    sub: "AI · DAILY",
    tagline: "AI news, distilled daily.",
    locale: "en-US",
    story: "STORY",
  },
  es: {
    showName: "DESTILADOS",
    badge: "DESTILADOS",
    sub: "IA · CADA DÍA",
    tagline: "Noticias de IA, destiladas cada día.",
    locale: "es-ES",
    story: "NOTICIA",
  },
};

// Number formatting follows the video's language. "always" grouping so Spanish writes 5.000, not 5000.
export const LocaleContext = createContext("en-US");
export const useFormat = () => {
  const locale = useContext(LocaleContext);
  return (n: number, digits = 0) =>
    n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: "always" } as unknown as Intl.NumberFormatOptions);
};
