import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { MAX_QUESTION_LENGTH, MAX_TURNS } from "../lib/consts";
import { messageText } from "../lib/references";
import type { Target } from "../lib/registry";
import { systemPrompt } from "./prompt";

/**
 * The only thing a visitor is ever told about a failure (spec #30): the
 * cause stays in the Worker's logs. The client adds Jorge's email.
 */
export const CONCIERGE_ERROR = "The Concierge can't answer right now.";

export type ConciergeDeps = {
  /** Injected, so tests can supply a mock. */
  model: LanguageModel;
  /** The target registry: the Concierge's whole corpus. */
  registry: () => Promise<Target[]>;
  /** The kill switch: every question is refused, and the client hides the entry point. */
  disabled: boolean;
  /** Whether this visitor, by IP, is still under the rate limit. */
  withinRateLimit: (visitor: string) => Promise<boolean>;
  /** Provider-specific settings, such as the reasoning effort. */
  providerOptions?: Parameters<typeof streamText>[0]["providerOptions"];
};

/**
 * Answers are one to three sentences, so a longer one in the conversation
 * wasn't written by the Concierge: it only inflates the prompt.
 */
const MAX_ANSWER_LENGTH = 2000;

/** Never cached, so the kill switch and limits apply to the very next request. */
const NO_STORE = { "cache-control": "no-store" };

const failure = (status: number) => Response.json({ error: CONCIERGE_ERROR }, { status, headers: NO_STORE });

/**
 * The conversation, if it's one a visitor could have sent: ends with their
 * question, within the length and turn limits.
 */
async function conversation(request: Request): Promise<UIMessage[] | undefined> {
  const body: unknown = await request.json().catch(() => undefined);
  if (typeof body !== "object" || body === null || !("messages" in body)) return;
  const result = await safeValidateUIMessages({ messages: body.messages });
  if (!result.success) return;

  const messages = result.data;
  const last = messages.at(-1);
  const fromVisitorOrConcierge = messages.every(
    (message) => message.role === "user" || message.role === "assistant"
  );
  if (!fromVisitorOrConcierge || last?.role !== "user" || !messageText(last).trim()) return;

  const questions = messages.filter((message) => message.role === "user");
  if (questions.length > MAX_TURNS) return;
  const withinLength = messages.every(
    (message) => messageText(message).length <= (message.role === "user" ? MAX_QUESTION_LENGTH : MAX_ANSWER_LENGTH)
  );
  if (!withinLength) return;
  return messages;
}

/**
 * Answers a visitor's question (`POST`) as a UI message stream of plain text
 * with inline `[[id]]` references (ADR 0004). A `GET` only says whether the
 * Concierge is on, so the client knows whether to show its entry point.
 *
 * The kill switch, the rate limit and every validation run before the model
 * is called, and every failure gets the same generic error.
 */
export async function handleConcierge(request: Request, deps: ConciergeDeps): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(null, { status: 405, headers: { allow: "GET, POST" } });
  }
  if (deps.disabled) return failure(503);
  if (request.method === "GET") return new Response(null, { status: 204, headers: NO_STORE });

  const visitor = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    if (!(await deps.withinRateLimit(visitor))) return failure(429);
  } catch (error) {
    console.error("Concierge: rate limiter unavailable", error);
    return failure(503);
  }

  const messages = await conversation(request);
  if (!messages) return failure(400);

  let registry: Target[];
  try {
    registry = await deps.registry();
  } catch (error) {
    console.error("Concierge: registry unavailable", error);
    return failure(503);
  }

  const result = streamText({
    model: deps.model,
    instructions: systemPrompt(registry),
    messages: await convertToModelMessages(messages),
    providerOptions: deps.providerOptions,
    onError: ({ error }) => console.error("Concierge: model failed", error),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, onError: () => CONCIERGE_ERROR }),
  });
}
