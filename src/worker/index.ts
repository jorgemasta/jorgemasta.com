import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { CONCIERGE_ENDPOINT, REGISTRY_PATH } from "../lib/consts";
import type { Target } from "../lib/registry";
import { handleConcierge } from "./concierge";

type Env = {
  /** The built site: every route but the Concierge's is served from here. */
  ASSETS: { fetch: (request: Request | string) => Promise<Response> };
  /** Cloudflare's rate limiting binding, keyed by visitor IP (`wrangler.jsonc`). */
  CONCIERGE_RATE_LIMITER: { limit: (options: { key: string }) => Promise<{ success: boolean }> };
  CF_ACCOUNT_ID: string;
  CF_AI_GATEWAY: string;
  CF_AIG_TOKEN: string;
  /** An AI Gateway catalog id, such as `openai/gpt-6-luna`. */
  CONCIERGE_MODEL: string;
  /** Empty to leave the model's default. */
  CONCIERGE_REASONING_EFFORT: string;
  /** The kill switch: `true` turns the Concierge off and hides its entry point. */
  CONCIERGE_DISABLED: string;
};

/** Built with the site, so it only changes on deploy: read once per isolate. */
let registry: Promise<Target[]> | undefined;
const loadRegistry = (env: Env, url: string) =>
  (registry ??= env.ASSETS.fetch(new URL(REGISTRY_PATH, url).toString()).then((response) => {
    if (!response.ok) throw new Error(`Registry responded ${response.status}`);
    return response.json() as Promise<Target[]>;
  })).catch((error) => {
    registry = undefined;
    throw error;
  });

/**
 * The model, through AI Gateway's OpenAI-compatible endpoint and paid with
 * Unified Billing, so the only secret is the gateway token (ADR 0004, #34).
 */
const gateway = (env: Env) =>
  createOpenAICompatible({
    name: "gateway",
    baseURL: `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.CF_AI_GATEWAY}/compat`,
    headers: { "cf-aig-authorization": `Bearer ${env.CF_AIG_TOKEN}` },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname !== CONCIERGE_ENDPOINT) return env.ASSETS.fetch(request);

    return handleConcierge(request, {
      model: gateway(env)(env.CONCIERGE_MODEL),
      registry: () => loadRegistry(env, request.url),
      disabled: env.CONCIERGE_DISABLED === "true",
      withinRateLimit: async (visitor) => (await env.CONCIERGE_RATE_LIMITER.limit({ key: visitor })).success,
      providerOptions: env.CONCIERGE_REASONING_EFFORT
        ? { gateway: { reasoningEffort: env.CONCIERGE_REASONING_EFFORT } }
        : undefined,
    });
  },
};
