import type { Prose } from "../lib/facts";

/** Namespaces the Facts marked in About: `about/canary-islands`. */
export const ABOUT_ID = "about";

/** The About paragraphs on the homepage. May mark Facts. */
export const ABOUT: Prose[] = [
  [
    "I'm Jorge, a product-minded engineer based in ",
    { fact: "canary-islands", text: "the Canary Islands" },
    ". I've spent ",
    {
      fact: "experience",
      text: "the last nine years building web and mobile products, mostly on the frontend and product side",
    },
    ".",
  ],
  [
    "Lately I've been exploring ",
    { fact: "ai-native", text: "what changes when AI is part of the product itself instead of a feature added on top" },
    ". I like simple interfaces and opinionated products, and I like turning messy ideas into things people can actually use.",
  ],
];
