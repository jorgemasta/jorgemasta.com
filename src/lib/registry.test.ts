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
  about: [["I'm Jorge, based in ", { fact: "canary-islands", text: "the Canary Islands" }, "."]],
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

  it("gives every target a short label a chip can show", () => {
    const labels = Object.fromEntries(buildRegistry(input()).map((target) => [target.id, target.label]));

    expect(labels).toEqual({
      padelful: "Padelful",
      kontroloo: "Kontroloo",
      "appcenter-bugsnag": "App Center + Bugsnag",
      nexcess: "Nexcess",
      "episode-25": "Tokenizados #25",
      tokenizados: "Tokenizados",
      "about/canary-islands": "the Canary Islands",
    });
  });

  it("gives a Fact annotated in a Project's body an owner-namespaced id on the Project's page", () => {
    const registry = buildRegistry(
      input({
        projects: [
          {
            ...input().projects[0],
            body: 'Open to developers through <span data-fact="mcp">a public API and an MCP server</span>.',
          },
        ],
      })
    );

    expect(registry.find((target) => target.id === "padelful/mcp")).toEqual({
      id: "padelful/mcp",
      kind: "fact",
      path: "/",
      anchor: "fact-padelful--mcp",
      label: "a public API and an MCP server",
      text: "Padelful: a public API and an MCP server",
    });
  });

  it("places Facts from Earlier work and blog entries on their owner's own page", () => {
    const registry = buildRegistry(
      input({
        projects: [{ ...input().projects[1], body: '<span data-fact="nfc">NFC wristbands</span> at the gate.' }],
        entries: [{ ...input().entries[0], body: 'A <span data-fact="script">custom script</span>.' }],
      })
    );
    const byFactId = (id: string) => registry.find((target) => target.id === id);

    expect(byFactId("kontroloo/nfc")).toMatchObject({
      path: "/projects/kontroloo/",
      anchor: "fact-kontroloo--nfc",
    });
    expect(byFactId("appcenter-bugsnag/script")).toMatchObject({
      path: "/blog/2020/06/appcenter-bugsnag/",
      anchor: "fact-appcenter-bugsnag--script",
      text: "App Center + Bugsnag: custom script",
    });
  });

  it("leaves Fact annotations out of the owner's text", () => {
    const registry = buildRegistry(
      input({ entries: [{ ...input().entries[0], body: 'A <span data-fact="script">custom script</span>.' }] })
    );

    expect(registry.find((target) => target.id === "appcenter-bugsnag")!.text).toContain("A custom script.");
  });

  it("gives a Fact marked in a Role's impact an id namespaced by the Role, on the homepage", () => {
    const registry = buildRegistry(
      input({
        roles: [
          {
            ...input().roles[0],
            impact: ["Modernising ", { fact: "portal", text: "the customer portal" }, "."],
          },
        ],
      })
    );

    expect(registry.find((target) => target.id === "nexcess/portal")).toEqual({
      id: "nexcess/portal",
      kind: "fact",
      path: "/",
      anchor: "fact-nexcess--portal",
      label: "the customer portal",
      text: "Nexcess: the customer portal",
    });
    expect(registry.find((target) => target.id === "nexcess")!.text).toContain(
      "Modernising the customer portal."
    );
  });

  it("gives a Fact marked in About an id namespaced by About, on the homepage", () => {
    expect(byId("about/canary-islands")).toEqual({
      id: "about/canary-islands",
      kind: "fact",
      path: "/",
      anchor: "fact-about--canary-islands",
      label: "the Canary Islands",
      text: "About Jorge: the Canary Islands",
    });
  });

  it("fails on duplicate Fact ids within an owner", () => {
    const clash = input({
      about: [[{ fact: "canary-islands", text: "Gran Canaria" }], [{ fact: "canary-islands", text: "Tenerife" }]],
    });

    expect(() => buildRegistry(clash)).toThrow(/Duplicate target id "about\/canary-islands".*fact.*fact/);
  });

  it("fails on a Fact name that isn't a lowercase slug", () => {
    const badName = input({ about: [[{ fact: "Canary Islands", text: "the Canary Islands" }]] });

    expect(() => buildRegistry(badName)).toThrow(/Fact "about\/Canary Islands"/);
  });

  it("fails on Fact markup in a markdown body that doesn't parse, rather than skipping it", () => {
    const typo = input({
      projects: [{ ...input().projects[0], body: "Open through <span data-fact='mcp'>an MCP server</span>." }],
    });

    expect(() => buildRegistry(typo)).toThrow(/padelful.*data-fact/);
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
          <section id="tokenizados"><li id="episode-25"></li></section>
          <p>Based in <span id="fact-about--canary-islands">the Canary Islands</span>.</p>`,
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
