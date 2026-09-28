import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type UIMessage,
} from "ai";
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
  /** Provider-specific settings, such as the reasoning effort. */
  providerOptions?: Parameters<typeof streamText>[0]["providerOptions"];
};

const failure = (status: number) => Response.json({ error: CONCIERGE_ERROR }, { status });

/** The conversation, if it's one a visitor could have sent: ends with their question. */
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
  return messages;
}

/**
 * Answers a visitor's question as a UI message stream of plain text with
 * inline `[[id]]` references (ADR 0004).
 */
export async function handleConcierge(request: Request, deps: ConciergeDeps): Promise<Response> {
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
