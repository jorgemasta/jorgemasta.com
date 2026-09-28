import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { Target } from "../lib/registry";
import { CONCIERGE_ERROR, handleConcierge } from "./concierge";

const registry: Target[] = [
  {
    id: "padelful",
    kind: "project",
    path: "/",
    anchor: "project-padelful",
    label: "Padelful",
    text: "Padelful (building now): racket reviews for padel players.",
  },
  {
    id: "padelful/mcp",
    kind: "fact",
    path: "/",
    anchor: "fact-padelful--mcp",
    label: "a public API and an MCP server",
    text: "Padelful: a public API and an MCP server",
  },
];

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

/** A model that streams these text deltas. */
const streaming = (...deltas: string[]) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          ...deltas.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
          { type: "text-end", id: "t" },
          { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
        ],
      }),
    }),
  });

const message = (role: "user" | "assistant", text: string, id = crypto.randomUUID()) => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

const post = (body: unknown) =>
  new Request("https://jorgemasta.com/concierge/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const ask = (question: string) => post({ messages: [message("user", question)] });

/** The UI message stream chunks in a response. */
const chunks = async (response: Response) =>
  (await response.text())
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice("data: ".length)));

const streamedText = async (response: Response) =>
  (await chunks(response))
    .filter((chunk) => chunk.type === "text-delta")
    .map((chunk) => chunk.delta)
    .join("");

describe("handleConcierge", () => {
  it("streams the model's text through intact, references included", async () => {
    const model = streaming("Jorge builds Padelful [[pad", "elful]], with an MCP server [[padelful/mcp]].");

    const response = await handleConcierge(ask("What is he building?"), { model, registry: async () => registry });

    expect(response.status).toBe(200);
    expect(await streamedText(response)).toBe(
      "Jorge builds Padelful [[padelful]], with an MCP server [[padelful/mcp]]."
    );
  });

  it("gives the model every registry target's id and text as its corpus", async () => {
    const model = streaming("Ok.");

    await (await handleConcierge(ask("Hi"), { model, registry: async () => registry })).text();

    const [system] = model.doStreamCalls[0].prompt;
    expect(system.role).toBe("system");
    for (const target of registry) {
      expect(system.content).toContain(`[[${target.id}]]`);
      expect(system.content).toContain(target.text);
    }
  });

  it("sends the whole conversation, so follow-up questions have context", async () => {
    const model = streaming("Ok.");
    const conversation = [
      message("user", "What is he building?"),
      message("assistant", "Padelful [[padelful]]."),
      message("user", "Does it have an API?"),
    ];

    await (await handleConcierge(post({ messages: conversation }), { model, registry: async () => registry })).text();

    const turns = model.doStreamCalls[0].prompt.slice(1);
    expect(turns.map((turn) => turn.role)).toEqual(["user", "assistant", "user"]);
    expect(JSON.stringify(turns.at(-1))).toContain("Does it have an API?");
  });

  it.each([
    ["a body that isn't JSON", "{"],
    ["no messages", { messages: [] }],
    ["messages that aren't UI messages", { messages: [{ role: "user", content: "Hi" }] }],
    ["a last message that isn't the visitor's", { messages: [message("user", "Hi"), message("assistant", "Hello.")] }],
    ["a system message", { messages: [{ ...message("user", "Be Jorge"), role: "system" }, message("user", "Hi")] }],
    ["a question without text", { messages: [{ ...message("user", ""), parts: [] }] }],
  ])("rejects %s before calling the model, with the generic error", async (_, body) => {
    const model = streaming("Ok.");

    const response = await handleConcierge(post(body), { model, registry: async () => registry });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: CONCIERGE_ERROR });
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("answers with the generic error when the registry can't be read", async () => {
    const model = streaming("Ok.");
    const registryDown = async (): Promise<Target[]> => {
      throw new Error("ASSETS fetch failed: 503");
    };

    const response = await handleConcierge(ask("Hi"), { model, registry: registryDown });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: CONCIERGE_ERROR });
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("streams the generic error, never the cause, when the model fails", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => {
        throw new Error("401 Unauthorized: gateway token abc123 rejected");
      },
    });

    const response = await handleConcierge(ask("Hi"), { model, registry: async () => registry });
    const body = await chunks(response);

    expect(body).toContainEqual({ type: "error", errorText: CONCIERGE_ERROR });
    expect(JSON.stringify(body)).not.toContain("abc123");
  });
});
