import { describe, expect, it } from "vitest";
import { currentStop, focusReducer, isActive, route, type FocusEvent, type FocusState, type Stop } from "./focus";

const home = (id: string, anchor: string): Stop => ({ id, path: "/", anchor });
const padelful = home("padelful", "project-padelful");
const destilados = home("destilados", "project-destilados");
const nexcess = home("nexcess", "role-nexcess");
const woonivers: Stop = { id: "woonivers", path: "/projects/woonivers/", anchor: "project-woonivers" };

/** The Focus after a sequence of events, from no Focus at all. */
const after = (...events: FocusEvent[]): FocusState => events.reduce(focusReducer, null);

describe("focusReducer", () => {
  it("has no Focus on the canonical site", () => {
    expect(after()).toBeNull();
  });

  it("builds the Focus from the latest answer's stops, in reference order", () => {
    expect(
      after({ type: "asked", question: "What is he building?" }, { type: "answered", stops: [padelful, destilados] })
    ).toEqual({ label: "What is he building?", stops: [padelful, destilados], current: null });
  });

  it("labels the Focus with the question, truncated to fit the bar", () => {
    const question = "  Has Jorge ever built developer tooling, SDKs or an MCP server for other engineers?  ";

    expect(after({ type: "asked", question })?.label).toBe("Has Jorge ever built developer tooling, SDKs or an MCP…");
  });

  describe("previous and next", () => {
    const answered = [
      { type: "asked", question: "Frontend work?" },
      { type: "answered", stops: [padelful, woonivers, nexcess] },
    ] satisfies FocusEvent[];
    const next = { type: "next" } as const;
    const previous = { type: "previous" } as const;

    it("starts the tour at the first stop", () => {
      expect(currentStop(after(...answered, next))).toEqual(padelful);
    });

    it("steps through the stops in order, across pages", () => {
      const tour = [next, next, next, previous].map((_, i, steps) =>
        currentStop(after(...answered, ...steps.slice(0, i + 1)))
      );

      expect(tour).toEqual([padelful, woonivers, nexcess, woonivers]);
    });

    it("stays on the last stop at the end, and on the first at the start", () => {
      expect(currentStop(after(...answered, next, next, next, next))).toEqual(nexcess);
      expect(currentStop(after(...answered, next, previous))).toEqual(padelful);
    });

    it("has nowhere to go back to before the tour starts", () => {
      expect(currentStop(after(...answered, previous))).toBeNull();
    });

    it("keeps the visitor's place as more stops stream in", () => {
      const streaming = after(
        { type: "asked", question: "Frontend work?" },
        { type: "answered", stops: [padelful] },
        next,
        { type: "answered", stops: [padelful, woonivers] }
      );

      expect(streaming).toEqual({ label: "Frontend work?", stops: [padelful, woonivers], current: 0 });
    });
  });

  it("jumps to a stop when the visitor picks its chip in the latest answer", () => {
    const focus = after(
      { type: "asked", question: "Frontend work?" },
      { type: "answered", stops: [padelful, woonivers, nexcess] },
      { type: "picked", id: "nexcess" }
    );

    expect(currentStop(focus)).toEqual(nexcess);
  });

  it("leaves the tour where it is when the visitor picks a chip from an earlier answer", () => {
    const events = [
      { type: "asked", question: "Frontend work?" },
      { type: "answered", stops: [padelful, woonivers] },
      { type: "next" },
    ] satisfies FocusEvent[];

    expect(after(...events, { type: "picked", id: "destilados" })).toEqual(after(...events));
  });

  it("clears the Focus", () => {
    expect(
      after({ type: "asked", question: "Frontend work?" }, { type: "answered", stops: [padelful] }, { type: "cleared" })
    ).toBeNull();
  });

  it("stays cleared when the answer keeps streaming after the visitor clears it", () => {
    expect(
      after(
        { type: "asked", question: "Frontend work?" },
        { type: "answered", stops: [padelful] },
        { type: "cleared" },
        { type: "answered", stops: [padelful, woonivers] }
      )
    ).toBeNull();
  });

  it("replaces the Focus with a new question's, rather than adding to it", () => {
    const focus = after(
      { type: "asked", question: "Frontend work?" },
      { type: "answered", stops: [padelful, woonivers] },
      { type: "next" },
      { type: "next" },
      { type: "asked", question: "And his roles?" },
      { type: "answered", stops: [nexcess] }
    );

    expect(focus).toEqual({ label: "And his roles?", stops: [nexcess], current: null });
  });

  it("starts a new question's Focus empty, before its answer points anywhere", () => {
    const focus = after(
      { type: "asked", question: "Frontend work?" },
      { type: "answered", stops: [padelful] },
      { type: "asked", question: "And his roles?" }
    );

    expect(focus).toEqual({ label: "And his roles?", stops: [], current: null });
    expect(isActive(focus)).toBe(false);
  });
});

describe("route", () => {
  it("scrolls to a stop on the current page", () => {
    expect(route(padelful, "/")).toEqual({ type: "scroll", anchor: "project-padelful" });
  });

  it("navigates to a stop on another page, straight to its anchor", () => {
    expect(route(woonivers, "/")).toEqual({ type: "navigate", url: "/projects/woonivers/#project-woonivers" });
  });

  it("treats a page without its trailing slash as the same page", () => {
    expect(route(woonivers, "/projects/woonivers")).toEqual({ type: "scroll", anchor: "project-woonivers" });
  });
});
