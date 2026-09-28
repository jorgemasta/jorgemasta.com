import { describe, expect, it } from "vitest";
import { buildRegistry, findMissingAnchors, type RegistryInput } from "./registry";

const input = (overrides: Partial<RegistryInput> = {}): RegistryInput => ({
  projects: [
    {
      id: "padelful",
      title: "Padelful",
      excerpt: "Racket reviews for padel players.",
      body: "Padelful exposes a public API.",
      status: "building",
      stats: [{ value: "1,708", label: "rackets tracked" }],
    },
    {
      id: "kontroloo",
      title: "Kontroloo",
      excerpt: "Access control for festivals.",
      body: "A startup from Las Palmas.",
      status: "earlier",
      stats: [],
    },
  ],
  entries: [
    {
      id: "appcenter-bugsnag",
      title: "App Center + Bugsnag",
      excerpt: "Upload source maps automatically.",
      body: "A custom script.",
      publishedAt: new Date("2020-06-13"),
    },
  ],
  roles: [
    {
      id: "nexcess",
      company: "Nexcess",
      title: "Engineer III",
      start: "Jun 2026",
      impact: "Modernising the customer portal.",
    },
  ],
  episodes: [
    { number: 25, title: "El Sistema 1", date: new Date("2026-09-19"), link: "https://example.com/25" },
  ],
  episodeCount: 25,
  ...overrides,
});

const byId = (id: string) => buildRegistry(input()).find((target) => target.id === id);

describe("buildRegistry", () => {
  it("places building Projects on the homepage and Earlier work on their own page", () => {
    expect(byId("padelful")).toMatchObject({ kind: "project", path: "/", anchor: "project-padelful" });
    expect(byId("kontroloo")).toMatchObject({
      kind: "project",
      path: "/projects/kontroloo/",
      anchor: "project-kontroloo",
    });
  });

  it("gives a Project's title, excerpt, body and shown stats as its text", () => {
    const { text } = byId("padelful")!;

    expect(text).toContain("Padelful");
    expect(text).toContain("Racket reviews for padel players.");
    expect(text).toContain("Padelful exposes a public API.");
    expect(text).toContain("1,708 rackets tracked");
  });

  it("places blog entries on their dated page and marks Archive ones", () => {
    const entry = byId("appcenter-bugsnag")!;

    expect(entry).toMatchObject({
      kind: "entry",
      path: "/blog/2020/06/appcenter-bugsnag/",
      anchor: "entry-appcenter-bugsnag",
    });
    expect(entry.text).toContain("Archive");
  });

  it("gives every Role its stable id on the homepage", () => {
    expect(byId("nexcess")).toMatchObject({ kind: "role", path: "/", anchor: "role-nexcess" });
    expect(byId("nexcess")!.text).toContain("Engineer III, Nexcess, Jun 2026 – now");
  });

  it("includes only the Episodes it is given, with fixed ids", () => {
    const targets = buildRegistry(input()).filter((target) => target.kind === "episode");

    expect(targets).toEqual([
      expect.objectContaining({ id: "episode-25", path: "/", anchor: "episode-25" }),
    ]);
    expect(targets[0].text).toContain("El Sistema 1");
  });

  it("includes the Tokenizados block with its episode count", () => {
    expect(byId("tokenizados")).toMatchObject({ kind: "tokenizados", path: "/", anchor: "tokenizados" });
    expect(byId("tokenizados")!.text).toContain("25 episodes");
  });

  it("fails on duplicate ids, naming the id and both kinds", () => {
    const clash = input({
      roles: [{ id: "padelful", company: "Padelful", title: "Founder", start: "2023", impact: "Built it." }],
    });

    expect(() => buildRegistry(clash)).toThrow(/Duplicate target id "padelful".*project.*role/);
  });
});

describe("findMissingAnchors", () => {
  const registry = buildRegistry(input());
  const pages: Record<string, string> = {
    "/": `<article id="project-padelful"></article><li id="role-nexcess"></li>
          <section id="tokenizados"><li id="episode-25"></li></section>`,
    "/projects/kontroloo/": `<article id="project-kontroloo"></article>`,
    "/blog/2020/06/appcenter-bugsnag/": `<article id=entry-appcenter-bugsnag></article>`,
  };

  it("finds nothing when every anchor is in its page", () => {
    expect(findMissingAnchors(registry, (path) => pages[path])).toEqual([]);
  });

  it("reports anchors missing from their page, and pages that were not built", () => {
    const missing = findMissingAnchors(registry, (path) =>
      path === "/projects/kontroloo/" ? undefined : pages[path]?.replace('id="role-nexcess"', "")
    );

    expect(missing.map((target) => target.id)).toEqual(["kontroloo", "nexcess"]);
  });
});
