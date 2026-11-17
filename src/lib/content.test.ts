import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ProjectData = { title: string; publishedAt: Date; status: "building" | "earlier"; featured: boolean; draft: boolean };
type LabData = { title: string; publishedAt: Date; excerpt: string; question: string; draft: boolean };
type Entry = { id: string; data: { publishedAt: Date; draft: boolean } };
const collection: Entry[] = [];
/** The `?data=` fixture set `astro dev` would use, or null for the real content. */
let devSet: { labs: Entry[] } | null = null;

vi.mock("astro:content", () => ({
  defineCollection: (config: unknown) => config,
  getCollection: async (_name: string, filter?: (entry: unknown) => boolean) =>
    filter ? collection.filter(filter) : collection,
}));

vi.mock("../dev/fixtures", () => ({ getDevData: () => devSet }));

const { getHomepageProjects, getLabs } = await import("./content");

const project = (id: string, publishedAt: string, more: Partial<ProjectData> = {}) => ({
  id,
  data: { title: id, publishedAt: new Date(publishedAt), status: "earlier", featured: false, draft: false, ...more } as ProjectData,
});

const lab = (id: string, publishedAt: string, more: Partial<LabData> = {}) => ({
  id,
  data: {
    title: id,
    publishedAt: new Date(publishedAt),
    excerpt: `What ${id} tries.`,
    question: `What does ${id} find out?`,
    draft: false,
    ...more,
  } as LabData,
});

const ids = (list: { id: string }[]) => list.map((p) => p.id);

beforeEach(() => {
  collection.length = 0;
  devSet = null;
});

describe("getHomepageProjects", () => {

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
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns published Labs newest first", async () => {
    collection.push(lab("first", "2026-01-10"), lab("latest", "2026-11-01"), lab("middle", "2026-06-01"));

    expect(ids(await getLabs())).toEqual(["latest", "middle", "first"]);
  });

  it("leaves drafts out of a build", async () => {
    vi.stubEnv("DEV", false);
    collection.push(lab("published", "2026-06-01"), lab("draft", "2026-11-01", { draft: true }));

    expect(ids(await getLabs())).toEqual(["published"]);
  });

  it("reads the ?data= fixture set while developing, like posts and projects", async () => {
    collection.push(lab("real", "2026-06-01"));
    devSet = { labs: [lab("fixture-old", "2026-01-01"), lab("fixture-new", "2026-10-01")] };

    expect(ids(await getLabs())).toEqual(["fixture-new", "fixture-old"]);
  });
});
