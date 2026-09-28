import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import { CONCIERGE_ENDPOINT, EMAIL, MAX_QUESTION_LENGTH } from "../lib/consts";
import {
  currentStop,
  focusReducer,
  isActive,
  restoreFocus,
  type Focus,
  type FocusEvent,
  type FocusState,
} from "../lib/focus";
import { goTo, showInUrl, spotlight } from "../lib/focus-dom";
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

/** What survives a refresh within the tab: the conversation and the Focus. */
type Session = { messages: UIMessage[]; focus: FocusState };

const SESSION_KEY = "concierge";

/** The session saved in this tab, if any. Storage can be missing or blocked, and the server has none. */
function loadSession(): Session | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    return Array.isArray(saved?.messages) ? { messages: saved.messages, focus: saved.focus ?? null } : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Without storage, a refresh starts over; the Concierge works the same.
  }
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

/**
 * The Concierge: a panel that answers questions about Jorge's work in one to three
 * sentences, with a chip for every place on the site the answer points at.
 * Persisted across `ClientRouter` navigations, so the conversation stays put.
 */
export default function Concierge({ targets }: { targets: ChipTarget[] }) {
  const byId = useMemo(() => new Map(targets.map((target) => [target.id, target])), [targets]);
  const isKnown = (id: string) => byId.has(id);
  const available = useAvailable();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  // The conversation saved in this tab, so a refresh picks up where the visitor was.
  const [saved] = useState(loadSession);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: CONCIERGE_ENDPOINT }),
    messages: saved?.messages,
  });
  const busy = status === "submitted" || status === "streaming";

  const [focus, setFocus] = useState<FocusState>(null);
  // Restored once the page's URL can be read: the saved Focus, or the one a shared link carries.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    setFocus(restoreFocus(saved?.focus ?? null, location.search, (id) => byId.get(id)));
    setRestored(true);
  }, []);
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
  // A restored answer is already in the restored Focus, or deliberately not (cleared, or replaced by a shared link).
  const references = latestReferences(messages, isKnown);
  const referencesKey = references.join(" ");
  const answeredKey = useRef(latestReferences(saved?.messages ?? [], isKnown).join(" "));
  useEffect(() => {
    if (referencesKey === answeredKey.current) return;
    answeredKey.current = referencesKey;
    send({ type: "answered", stops: references.map((id) => byId.get(id)!) });
  }, [referencesKey, byId]);

  // Spotlight the current stop on whichever page the visitor is on.
  const stop = currentStop(focus);
  const pageLoads = usePageLoads();
  useEffect(() => (stop ? spotlight(stop) : undefined), [stop, pageLoads]);

  // Keep the conversation and Focus for a refresh, and the Focus in the URL for sharing,
  // on every page. Not before the Focus is restored, so the link being opened isn't overwritten.
  useEffect(() => {
    if (restored) saveSession({ messages, focus });
  }, [restored, messages, focus]);
  useEffect(() => {
    if (restored) showInUrl(focus);
  }, [restored, focus, pageLoads]);

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
      besidePanel={open}
      onPrevious={() => move({ type: "previous" })}
      onNext={() => move({ type: "next" })}
      onClear={() => send({ type: "cleared" })}
    />
  );

  if (!available) return null;

  if (!open) {
    return (
      <>
        {focusBar}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded="false"
          aria-controls="concierge"
          className="fixed right-6 bottom-6 z-40 rounded-full border border-rule bg-paper px-5 py-3 text-sm font-medium text-green shadow-[0_12px_32px_-12px_rgb(23_63_53/0.35)] transition-colors hover:bg-paper-deep"
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
                  {parseAnswer(messageText(message), isKnown).parts.map((part, i) =>
                    part.type === "text" ? (
                      <span key={i}>{part.text}</span>
                    ) : (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          send({ type: "picked", id: part.id });
                          goTo(byId.get(part.id)!);
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
 * and the way out. Shown on every page while a Focus is active.
 */
function FocusBar({
  focus,
  besidePanel,
  onPrevious,
  onNext,
  onClear,
}: {
  focus: Focus;
  /** The open panel takes the right of the screen on desktop, so the bar centres on the page beside it. */
  besidePanel: boolean;
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
      className={`pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 lg:bottom-6 ${besidePanel ? "lg:right-(--concierge-width)" : ""}`}
    >
      <nav
        aria-label="Focus"
        className="pointer-events-auto flex max-w-lg min-w-0 items-center gap-1 rounded-full border border-rule bg-paper py-1.5 pr-1.5 pl-5 shadow-[0_12px_32px_-12px_rgb(23_63_53/0.35)]"
      >
        <p className="min-w-0 flex-1 truncate text-sm text-charcoal" title={label}>
          {label}
        </p>
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
