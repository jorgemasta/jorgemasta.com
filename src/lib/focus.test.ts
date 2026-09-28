import { describe, expect, it } from "vitest";
import { currentStop, focusReducer, isActive, returnPoint, route, type FocusEvent, type FocusState, type Stop } from "./focus";

const home = (id: string, anchor: string): Stop => ({ id, path: "/", anchor });
const padelful = home("padelful", "project-padelful");
const destilados = home("destilados", "project-destilados");
const nexcess = home("nexcess", "role-nexcess");
const woonivers: Stop = { id: "woonivers", path: "/projects/woonivers/", anchor: "project-woonivers" };

/** Where the visitor was when they asked. */
const from = { path: "/blog/", scrollY: 640 };
const asked = (question: string) => ({ type: "asked", question, from }) as const;
/** The visitor took over while the answer streamed, so the tour waits for them. */
const interacted = { type: "interacted" } as const;

/** The Focus after a sequence of events, from no Focus at all. */
const after = (...events: FocusEvent[]): FocusState => events.reduce(focusReducer, null);

describe("focusReducer", () => {
  it("has no Focus on the canonical site", () => {
    expect(after()).toBeNull();
  });

  it("builds the Focus from the latest answer's stops, in reference order", () => {
    expect(
      after(asked("What is he building?"), interacted, { type: "answered", stops: [padelful, destilados] })
    ).toEqual({ label: "What is he building?", stops: [padelful, destilados], current: null, move: "cancelled", from });
  });

  it("labels the Focus with the question, truncated to fit the bar", () => {
    const question = "  Has Jorge ever built developer tooling, SDKs or an MCP server for other engineers?  ";

    expect(after(asked(question))?.label).toBe("Has Jorge ever built developer tooling, SDKs or an MCP…");
  });

  describe("the automatic move", () => {
    it("takes the visitor to the first stop as soon as it streams in", () => {
      const focus = after(asked("Frontend work?"), { type: "answered", stops: [woonivers] });

      expect(currentStop(focus)).toEqual(woonivers);
      expect(focus?.move).toBe("used");
    });

    it("happens once per answer, so later stops only join the Focus", () => {
      const focus = after(
        asked("Frontend work?"),
        { type: "answered", stops: [woonivers] },
        { type: "next" },
        { type: "answered", stops: [woonivers, padelful, nexcess] }
      );

      expect(focus).toMatchObject({ stops: [woonivers, padelful, nexcess], current: 0, move: "used" });
    });

    it("stays pending while the answer points nowhere yet", () => {
      expect(after(asked("Frontend work?"), { type: "answered", stops: [] })?.move).toBe("pending");
    });

    it("is cancelled when the visitor scrolls, taps or types before the first stop arrives", () => {
      const focus = after(asked("Frontend work?"), interacted, { type: "answered", stops: [woonivers, padelful] });

      expect(focus).toMatchObject({ stops: [woonivers, padelful], current: null, move: "cancelled" });
    });

    it("stays used when the visitor interacts after it", () => {
      const focus = after(asked("Frontend work?"), { type: "answered", stops: [woonivers] }, interacted);

      expect(focus?.move).toBe("used");
    });

    it("is pending again for a new question's answer", () => {
      const focus = after(
        asked("Frontend work?"),
        { type: "answered", stops: [woonivers] },
        asked("And his roles?")
      );

      expect(focus?.move).toBe("pending");
    });
  });

  describe("previous and next", () => {
    const answered = [asked("Frontend work?"), interacted, { type: "answered", stops: [padelful, woonivers, nexcess] }] satisfies FocusEvent[];
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
        asked("Frontend work?"),
        interacted,
        { type: "answered", stops: [padelful] },
        next,
        { type: "answered", stops: [padelful, woonivers] }
      );

      expect(streaming).toMatchObject({ stops: [padelful, woonivers], current: 0 });
    });
  });

  it("jumps to a stop when the visitor picks its chip in the latest answer", () => {
    const focus = after(
      asked("Frontend work?"),
      { type: "answered", stops: [padelful, woonivers, nexcess] },
      { type: "picked", id: "nexcess" }
    );

    expect(currentStop(focus)).toEqual(nexcess);
  });

  it("leaves the tour where it is when the visitor picks a chip from an earlier answer", () => {
    const events = [
      asked("Frontend work?"),
      { type: "answered", stops: [padelful, woonivers] },
      { type: "next" },
    ] satisfies FocusEvent[];

    expect(after(...events, { type: "picked", id: "destilados" })).toEqual(after(...events));
  });

  it("clears the Focus", () => {
    expect(after(asked("Frontend work?"), { type: "answered", stops: [padelful] }, { type: "cleared" })).toBeNull();
  });

  it("stays cleared when the answer keeps streaming after the visitor clears it", () => {
    expect(
      after(
        asked("Frontend work?"),
        { type: "answered", stops: [padelful] },
        { type: "cleared" },
        { type: "answered", stops: [padelful, woonivers] }
      )
    ).toBeNull();
  });

  describe("back to where you were", () => {
    const moved = [asked("Frontend work?"), { type: "answered", stops: [woonivers, padelful] }] satisfies FocusEvent[];
    const back = { type: "returned" } as const;

    it("is offered once the automatic move has taken the visitor somewhere, back to where they asked", () => {
      expect(returnPoint(after(...moved))).toEqual(from);
      expect(returnPoint(after(...moved, { type: "next" }))).toEqual(from);
    });

    it("isn't offered when the Concierge hasn't moved the visitor", () => {
      expect(returnPoint(after())).toBeNull();
      expect(returnPoint(after(asked("Frontend work?")))).toBeNull();
      expect(returnPoint(after(asked("Frontend work?"), interacted, { type: "answered", stops: [woonivers] }))).toBeNull();
    });

    it("keeps the tour to take again, from the start, once the visitor is back", () => {
      const focus = after(...moved, { type: "next" }, back);

      expect(focus).toMatchObject({ stops: [woonivers, padelful], current: null });
      expect(returnPoint(focus)).toBeNull();
      expect(currentStop(after(...moved, back, { type: "next" }))).toEqual(woonivers);
    });

    it("differs from clearing, which leaves the visitor where they are and ends the Focus", () => {
      expect(after(...moved, { type: "cleared" })).toBeNull();
      expect(isActive(after(...moved, back))).toBe(true);
    });

    it("comes from the latest question, not an earlier one", () => {
      const newFrom = { path: "/", scrollY: 1200 };
      const focus = after(...moved, { type: "asked", question: "And his roles?", from: newFrom }, {
        type: "answered",
        stops: [nexcess],
      });

      expect(returnPoint(focus)).toEqual(newFrom);
    });
  });

  it("replaces the Focus with a new question's, rather than adding to it", () => {
    const newFrom = { path: "/projects/woonivers/", scrollY: 0 };
    const focus = after(
      asked("Frontend work?"),
      { type: "answered", stops: [padelful, woonivers] },
      { type: "next" },
      { type: "asked", question: "And his roles?", from: newFrom },
      interacted,
      { type: "answered", stops: [nexcess] }
    );

    expect(focus).toEqual({ label: "And his roles?", stops: [nexcess], current: null, move: "cancelled", from: newFrom });
  });

  it("starts a new question's Focus empty, before its answer points anywhere", () => {
    const focus = after(asked("Frontend work?"), { type: "answered", stops: [padelful] }, asked("And his roles?"));

    expect(focus).toEqual({ label: "And his roles?", stops: [], current: null, move: "pending", from });
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
