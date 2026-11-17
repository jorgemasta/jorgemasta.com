import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Data = { title: string; publishedAt: Date; status: "building" | "earlier"; featured: boolean; draft: boolean };
const collection: { id: string; data: Data }[] = [];

vi.mock("astro:content", () => ({
  defineCollection: (config: unknown) => config,
  getCollection: async (_name: string, filter?: (entry: unknown) => boolean) =>
    filter ? collection.filter(filter) : collection,
}));

const { getHomepageProjects, getLabs } = await import("./content");

const project = (id: string, publishedAt: string, more: Partial<Data> = {}) => ({
  id,
  data: { title: id, publishedAt: new Date(publishedAt), status: "earlier", featured: false, draft: false, ...more } as Data,
});

const ids = (list: { id: string }[]) => list.map((p) => p.id);

describe("getHomepageProjects", () => {
  beforeEach(() => {
    collection.length = 0;
  });

  it("shows building projects oldest first, so the longest-running product leads", async () => {
    collection.push(
      project("destilados", "2026-08-15", { status: "building" }),
      project("padelful", "2023-01-01", { status: "building" })
    );

    expect(ids((await getHomepageProjects()).building)).toEqual(["padelful", "destilados"]);
  });

  it("shows only featured Earlier work, newest first", async () => {
    collection.push(
      project("kontroloo", "2017-01-15", { featured: true }),
      project("aios", "2025-01-01", { featured: true }),
      project("woonivers", "2018-08-31"),
      project("food-to-bento", "2018-02-11", { featured: true }),
      project("padelful", "2023-01-01", { status: "building", featured: true })
    );

    expect(ids((await getHomepageProjects()).earlier)).toEqual(["aios", "food-to-bento", "kontroloo"]);
  });
});

describe("getLabs", () => {
  beforeEach(() => {
    collection.length = 0;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns published Labs newest first", async () => {
    collection.push(project("first", "2026-01-10"), project("latest", "2026-11-01"), project("middle", "2026-06-01"));

    expect(ids(await getLabs())).toEqual(["latest", "middle", "first"]);
  });

  it("leaves drafts out of a build", async () => {
    vi.stubEnv("DEV", false);
    collection.push(project("published", "2026-06-01"), project("draft", "2026-11-01", { draft: true }));

    expect(ids(await getLabs())).toEqual(["published"]);
  });
});
