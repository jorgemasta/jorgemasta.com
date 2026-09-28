import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import { CONCIERGE_ENDPOINT, EMAIL, MAX_QUESTION_LENGTH } from "../lib/consts";
import { currentStop, focusReducer, isActive, type Focus, type FocusEvent, type FocusState } from "../lib/focus";
import { goTo, spotlight } from "../lib/focus-dom";
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

/**
 * The ids the latest answer references, in order. Empty while a new question
 * waits for its answer, so the previous answer's stops don't carry over.
 */
function latestReferences(messages: UIMessage[], isKnown: (id: string) => boolean) {
  const last = messages.at(-1);
  return last?.role === "assistant" ? parseAnswer(messageText(last), isKnown).references : [];
}

/**
 * Whether the Worker has the Concierge switched on. Until it says so, and
 * whenever it can't be reached, there's no entry point: the site is the same
 * without it. `astro dev` has no Worker, so the panel always shows there.
 */
function useAvailable() {
  const [available, setAvailable] = useState(import.meta.env.DEV);
  useEffect(() => {
    if (import.meta.env.DEV) return;
    fetch(CONCIERGE_ENDPOINT)
      .then((response) => setAvailable(response.ok))
      .catch(() => setAvailable(false));
  }, []);
  return available;
}

/** Re-renders whenever `ClientRouter` finishes loading a page, so page-bound effects can re-run. */
function usePageLoads() {
  const [loads, setLoads] = useState(0);
  useEffect(() => {
    const onLoad = () => setLoads((loads) => loads + 1);
    document.addEventListener("astro:page-load", onLoad);
    return () => document.removeEventListener("astro:page-load", onLoad);
  }, []);
  return loads;
}

/** Below `lg`, where the site and the Concierge never share the screen (#28). */
const NARROW = "(width < 64rem)";

/** Whether the viewport is narrow, following it as it changes. */
function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = matchMedia(NARROW);
    setNarrow(query.matches);
    const onChange = () => setNarrow(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

/** How long a finished answer stays on screen before the sheet gives the page back. */
const COLLAPSE_DELAY = 1200;

/**
 * The Concierge: a panel that answers questions about Jorge's work in one to three
 * sentences, with a chip for every place on the site the answer points at.
 * Persisted across `ClientRouter` navigations, so the conversation stays put.
 */
export default function Concierge({ targets }: { targets: ChipTarget[] }) {
  const byId = useMemo(() => new Map(targets.map((target) => [target.id, target])), [targets]);
  const available = useAvailable();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: CONCIERGE_ENDPOINT }),
  });
  const busy = status === "submitted" || status === "streaming";

  const [focus, setFocus] = useState<FocusState>(null);
  const send = (event: FocusEvent) => setFocus((focus) => focusReducer(focus, event));
  /** Sends an event that may change the stop, and takes the visitor to the new one. */
  const move = (event: FocusEvent) => {
    const next = focusReducer(focus, event);
    setFocus(next);
    const stop = currentStop(next);
    if (stop && stop !== currentStop(focus)) goTo(stop);
  };

  // The stops of the latest answer form the Focus, growing as the answer streams in.
  // Keyed on the ids, so the Focus updates when a reference completes, not on every streamed token.
  const references = latestReferences(messages, (id) => byId.has(id));
  const referencesKey = references.join(" ");
  useEffect(() => {
    send({ type: "answered", stops: references.map((id) => byId.get(id)!) });
  }, [referencesKey, byId]);

  // Spotlight the current stop on whichever page the visitor is on.
  const stop = currentStop(focus);
  const pageLoads = usePageLoads();
  useEffect(() => (stop ? spotlight(stop) : undefined), [stop, pageLoads]);

  // On a phone the site and the chat never share the screen: once an answer
  // has stops, the sheet collapses into the Focus bar, unless the visitor is
  // already typing a follow-up. They can reopen it from the bar.
  const narrow = useNarrow();
  const typing = input.length > 0;
  /** Whether an answer streamed in and hasn't had its chance to collapse the sheet yet. */
  const collapsePending = useRef(false);
  useEffect(() => {
    if (status === "streaming") collapsePending.current = true;
    if (status !== "ready" || !collapsePending.current) return;
    if (!narrow || !isActive(focus)) {
      collapsePending.current = false;
      return;
    }
    if (typing) return;
    const collapse = setTimeout(() => {
      collapsePending.current = false;
      setOpen(false);
    }, COLLAPSE_DELAY);
    return () => clearTimeout(collapse);
  }, [status, focus, narrow, typing]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  // Reopening a conversation on a phone is for reading it, so the keyboard stays down.
  useEffect(() => {
    if (open && !(narrow && messages.length)) inputRef.current?.focus();
  }, [open]);
  // Follow the answer as it streams, without moving the page behind the panel.
  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [open, messages, status]);

  const ask = (question: string) => {
    if (!question.trim() || busy) return;
    send({ type: "asked", question });
    sendMessage({ text: question.trim() });
    setInput("");
  };
  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    ask(input);
  };

  const focusBar = isActive(focus) && (
    <FocusBar
      focus={focus}
      panelOpen={open}
      onReopen={() => setOpen(true)}
      onPrevious={() => move({ type: "previous" })}
      onNext={() => move({ type: "next" })}
      onClear={() => send({ type: "cleared" })}
    />
  );

  if (!available) return null;

  if (!open) {
    // On a phone the Focus bar is also the entry control, so the two are one bar.
    return (
      <>
        {focusBar}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded="false"
          aria-controls="concierge"
          data-concierge-bar={focusBar ? undefined : ""}
          className={`${focusBar ? "hidden lg:block" : ""} fixed inset-x-4 bottom-4 z-40 rounded-full border border-rule bg-paper px-5 py-3 text-left text-sm font-medium text-green shadow-[0_12px_32px_-12px_rgb(23_63_53/0.35)] transition-colors hover:bg-paper-deep lg:inset-x-auto lg:right-6 lg:bottom-6 lg:text-center`}
        >
          Ask about my work…
        </button>
      </>
    );
  }

  return (
    <>
      {focusBar}
      <aside
        id="concierge"
        aria-label="Concierge"
        data-concierge-open
        onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        className="fixed inset-x-0 bottom-0 z-40 flex h-[68dvh] flex-col rounded-t-2xl border-t border-rule bg-paper shadow-[0_-12px_32px_-12px_rgb(23_63_53/0.35)] lg:inset-x-auto lg:inset-y-0 lg:right-0 lg:h-auto lg:w-(--concierge-width) lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none"
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
                        onClick={() => {
                          send({ type: "picked", id: part.id });
                          goTo(byId.get(part.id)!);
                          // On a phone the sheet would hide the stop, so it gives the page back.
                          if (narrow) setOpen(false);
                        }}
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
            maxLength={MAX_QUESTION_LENGTH}
            aria-describedby="concierge-question-length"
            className="flex-1 resize-none rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-green focus:outline-none"
          />
          <div className="flex flex-col items-end gap-1.5">
            <p id="concierge-question-length" className="text-xs text-muted tabular-nums">
              <span className="sr-only">Up to {MAX_QUESTION_LENGTH} characters: </span>
              {input.length}/{MAX_QUESTION_LENGTH}
            </p>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="button px-4 py-2 text-sm disabled:opacity-50"
            >
              Ask
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

/**
 * The Focus bar: why the page is spotlit, where the visitor is in the tour,
 * the way back to the conversation, and the way out. Shown on every page while
 * a Focus is active. On a phone it's also the entry control, and it gives way
 * to the open sheet.
 */
function FocusBar({
  focus,
  panelOpen,
  onReopen,
  onPrevious,
  onNext,
  onClear,
}: {
  focus: Focus;
  /**
   * The open panel takes the right of the screen on desktop, so the bar centres
   * on the page beside it. On a phone the open sheet replaces the bar.
   */
  panelOpen: boolean;
  onReopen: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onClear: () => void;
}) {
  const { label, stops, current } = focus;
  const started = current !== null;
  const control =
    "grid size-8 place-items-center rounded-full text-lg leading-none text-green transition-colors hover:bg-paper-deep disabled:text-muted/50 disabled:hover:bg-transparent";

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-4 z-30 justify-center px-4 lg:bottom-6 ${panelOpen ? "hidden lg:right-(--concierge-width) lg:flex" : "flex"}`}
      data-concierge-bar={panelOpen ? undefined : ""}
    >
      <nav
        aria-label="Focus"
        className="pointer-events-auto flex w-full max-w-lg min-w-0 items-center gap-1 rounded-full border border-rule bg-paper py-1.5 pr-1.5 pl-2 shadow-[0_12px_32px_-12px_rgb(23_63_53/0.35)] lg:w-auto"
      >
        <button
          type="button"
          onClick={onReopen}
          aria-expanded={panelOpen}
          aria-controls="concierge"
          aria-label={`Reopen the conversation: ${label}`}
          title={label}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full py-1 pr-2 pl-3 text-left text-sm text-charcoal transition-colors hover:bg-paper-deep"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 fill-none stroke-green stroke-[1.5] lg:hidden">
            <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{label}</span>
        </button>
        <button
          type="button"
          onClick={onPrevious}
          disabled={!current}
          aria-label="Previous stop"
          className={`ml-2 ${control}`}
        >
          ←
        </button>
        <p className="min-w-10 text-center text-sm text-muted tabular-nums" aria-live="polite">
          {started ? `${current + 1}/${stops.length}` : `${stops.length} ${stops.length === 1 ? "stop" : "stops"}`}
        </p>
        <button
          type="button"
          onClick={onNext}
          disabled={started && current === stops.length - 1}
          aria-label={started ? "Next stop" : "First stop"}
          className={control}
        >
          →
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Exit focus"
          className={`ml-1 ${control} text-xl text-muted hover:text-green`}
        >
          ×
        </button>
      </nav>
    </div>
  );
}
