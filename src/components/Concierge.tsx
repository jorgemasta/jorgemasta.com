import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { navigate } from "astro:transitions/client";
import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import { CONCIERGE_ENDPOINT, EMAIL } from "../lib/consts";
import { messageText, parseAnswer } from "../lib/references";
import type { Target } from "../lib/registry";

/** What the client needs to show a chip and take the visitor to its target. */
export type ChipTarget = Pick<Target, "id" | "label" | "path" | "anchor">;

/** A target without its text, which stays with the Worker. */
export const chipTarget = ({ id, label, path, anchor }: Target): ChipTarget => ({ id, label, path, anchor });

/** The same four on every page (#28). */
const SUGGESTED_PROMPTS = [
  "What is Jorge building right now?",
  "Why would Jorge fit a product team?",
  "Show me his AI work",
  "What has he done with frontend and DX?",
];

const samePage = (path: string) => location.pathname.replace(/\/?$/, "/") === path;

/** Scrolls to a target on this page, or navigates to its page, which then scrolls to it. */
function goTo(target: ChipTarget) {
  if (!samePage(target.path)) {
    navigate(`${target.path}#${target.anchor}`);
    return;
  }
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(target.anchor)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
}

/**
 * The Concierge: a panel that answers questions about Jorge's work in one to three
 * sentences, with a chip for every place on the site the answer points at.
 * Persisted across `ClientRouter` navigations, so the conversation stays put.
 */
export default function Concierge({ targets }: { targets: ChipTarget[] }) {
  const byId = useMemo(() => new Map(targets.map((target) => [target.id, target])), [targets]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: CONCIERGE_ENDPOINT }),
  });
  const busy = status === "submitted" || status === "streaming";

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  // Follow the answer as it streams, without moving the page behind the panel.
  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [open, messages, status]);

  const ask = (question: string) => {
    if (!question.trim() || busy) return;
    sendMessage({ text: question.trim() });
    setInput("");
  };
  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    ask(input);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded="false"
        aria-controls="concierge"
        className="fixed right-6 bottom-6 z-40 rounded-full border border-rule bg-paper px-5 py-3 text-sm font-medium text-green shadow-[0_12px_32px_-12px_rgb(23_63_53/0.35)] transition-colors hover:bg-paper-deep"
      >
        Ask about my work…
      </button>
    );
  }

  return (
    <aside
      id="concierge"
      aria-label="Concierge"
      data-concierge-open
      onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-rule bg-paper lg:w-(--concierge-width)"
    >
      <header className="flex items-baseline justify-between gap-4 border-b border-rule px-5 py-4">
        <div>
          <p className="font-serif text-xl text-green">Ask about Jorge's work</p>
          <p className="mt-1 text-xs text-muted">
            An AI that answers from this site. Questions are logged to improve it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-expanded="true"
          aria-controls="concierge"
          aria-label="Close"
          className="text-xl leading-none text-muted hover:text-green"
        >
          ×
        </button>
      </header>

      <div ref={conversationRef} className="flex-1 overflow-y-auto px-5 py-5" aria-live="polite">
        {messages.length === 0 && (
          <ul className="flex flex-col items-start gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  onClick={() => ask(prompt)}
                  className="rounded-full border border-rule px-3.5 py-1.5 text-left text-sm text-charcoal transition-colors hover:border-green hover:text-green"
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
        )}

        <ol className="flex flex-col gap-5">
          {messages.map((message) =>
            message.role === "user" ? (
              <li key={message.id} className="self-end rounded-2xl bg-paper-deep px-4 py-2 text-sm text-chocolate">
                {messageText(message)}
              </li>
            ) : (
              <li key={message.id} className="leading-relaxed text-charcoal">
                {parseAnswer(messageText(message), (id) => byId.has(id)).parts.map((part, i) =>
                  part.type === "text" ? (
                    <span key={i}>{part.text}</span>
                  ) : (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(byId.get(part.id)!)}
                      className="mx-0.5 inline-block max-w-56 truncate rounded-full border border-green/30 bg-paper-deep px-2 align-baseline text-sm text-green transition-colors hover:border-green"
                    >
                      {byId.get(part.id)!.label}
                    </button>
                  )
                )}
              </li>
            )
          )}
        </ol>

        {status === "submitted" && <p className="mt-5 text-muted">…</p>}
        {status === "error" && (
          <p className="mt-5 text-sm text-charcoal">
            The Concierge can't answer right now. You can email Jorge at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-rule px-5 py-4">
        <label htmlFor="concierge-question" className="sr-only">
          Your question
        </label>
        <textarea
          id="concierge-question"
          ref={inputRef}
          rows={2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              ask(input);
            }
          }}
          placeholder="Ask about my work…"
          className="flex-1 resize-none rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-green focus:outline-none"
        />
        <button type="submit" disabled={busy || !input.trim()} className="button px-4 py-2 text-sm disabled:opacity-50">
          Ask
        </button>
      </form>
    </aside>
  );
}
