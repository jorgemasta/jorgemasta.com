import type { UIMessage } from "ai";
import type { Role } from "../../data/roles";
import type { Prose } from "../../lib/facts";
import { placeholderImage, post, project } from "./entries";
import { item, podcastFrom } from "./podcast";
import type { DevData } from "./types";

/**
 * DEV ONLY. The most annoying real data the site could get: every value is
 * plausible or allowed by the schema. Each entry breaks in a different way;
 * the comment on it says which.
 */

const LONG_HOST = "northwind-industries-holdings-international.example.com";

const projects = () =>
  Promise.all([
    // Real, already-unbreakable hostname; huge unbreakable stat value; long stat label; a "0".
    project(
      "destilados",
      {
        title: "Destilados",
        publishedAt: "2026-08-15",
        status: "building",
        url: "https://destilados.tokenizadospodcast.com",
        excerpt: "A daily AI newsletter in Spanish, with an English edition, at destilados.tokenizadospodcast.com.",
        mainImage: {
          src: "/images/building/destilados.webp",
          alt: "Destilados English homepage: “The latest in AI, distilled”, a subscribe form and the latest edition",
        },
        stats: [
          { value: "€2,400,000,000", label: "in funding rounds covered since 15 Aug 2026" },
          { value: "1,284,000+", label: "words read every day" },
          { value: "0", label: "ads" },
        ],
      },
      `Each day it <span data-fact="sources">reads 26 newsletters, plus 9 outlets directly, and condenses them into a few stories, each with context and an honest opinion</span>.

Subscribe at https://destilados.tokenizadospodcast.com/subscribe?utm_source=jorgemasta.com&utm_medium=homepage&utm_campaign=building-section`
    ),
    // Oldest, so it leads. German compound title, no image, IDN url (renders as punycode),
    // four links with one long label, a long code line and a wide table in the body.
    project(
      "rechtsschutz",
      {
        title: "Rechtsschutzversicherungsgesellschaften",
        publishedAt: "2019-03-01",
        status: "building",
        url: "https://www.señorpádel.es",
        excerpt: "Comparador de seguros de protección jurídica para clubes de pádel en España y Latinoamérica.",
        links: [
          { label: "API docs", url: "https://docs.example.com" },
          { label: "@rechtsschutz/mcp-server", url: "https://www.npmjs.com/package/@rechtsschutz/mcp-server" },
          { label: "Model Context Protocol server for insurers (npm)", url: "https://www.npmjs.com/package/x" },
          { label: "Status", url: "https://status.example.com" },
        ],
      },
      `It <span data-fact="matcher">matches 1,284,000 policy listings to the right insurer every night</span>.

\`\`\`ts
const matcher = createMatcher({ stores: ["${LONG_HOST}"], threshold: 0.92 });
\`\`\`

| Store | Listings | Matched | Ambiguous | Agent-resolved | Human-resolved | Updated |
|---|---|---|---|---|---|---|
| ${LONG_HOST} | 1,284,000 | 1,201,334 | 82,666 | 79,002 | 3,664 | 2026-11-16 |`
    ),
    // Portrait phone screenshot, one-word Vietnamese title, Arabic (RTL) excerpt with a flag emoji, no stats, no links.
    project(
      "ung",
      {
        title: "Ứng",
        publishedAt: "2026-11-01",
        status: "building",
        url: "https://ung.app",
        excerpt: "تطبيق لتعلم اللغة الفيتنامية — học tiếng Việt mỗi ngày 🇻🇳",
        mainImage: { src: placeholderImage(1170, 2532, "Ứng"), alt: "Ứng on an iPhone" },
      },
      "One paragraph."
    ),
    // Broken image (typo in the path), a stat label far longer than its value.
    project(
      "padelful",
      {
        title: "Padelful",
        publishedAt: "2023-01-01",
        status: "building",
        url: "https://www.padelful.com",
        excerpt: "Racket reviews, ratings and price tracking for padel players, in English and Spanish.",
        mainImage: {
          src: "/images/building/padelfull.webp",
          alt: "Padelful homepage: a racket search box above the latest racket reviews, each with a score",
        },
        stats: [
          { value: "1,708", label: "rackets tracked across more than twenty European stores, every day" },
          { value: "2", label: "languages" },
          { value: "2023", label: "live since" },
        ],
      },
      `Padelful <span data-fact="agent">sends ambiguous listings to an agent that investigates them</span>.`
    ),
    // One-letter title, dated far in the future, missing image, Vietnamese excerpt with emoji.
    project("x", {
      title: "X",
      publishedAt: "2099-01-01",
      status: "building",
      url: "https://x.example.com",
      excerpt: "Ứng dụng đặt sân pa-đen cho người chơi ở Việt Nam 🎾",
      mainImage: {
        src: "/images/building/x-does-not-exist.webp",
        alt: "Trang chủ của ứng dụng X: ô tìm kiếm sân, danh sách sân gần nhất và đánh giá của người chơi",
      },
    }),
    // Earlier work with every optional field filled (url, a long stat label, a long link label),
    // a 20th-century date, and a body with a long command, a wide table, a long code line and a huge image.
    project(
      "donaudampfschifffahrt",
      {
        title: "Donaudampfschifffahrtsgesellschaftskapitänsmütze",
        publishedAt: "1999-12-31",
        excerpt: `Inventory sync for ${LONG_HOST} and its 14 regional storefronts`,
        url: `https://${LONG_HOST}/es/tiendas/inventario-en-tiempo-real`,
        stats: [
          { value: "1,284,000+", label: "SKUs reconciled nightly across every regional warehouse and marketplace feed" },
          { value: "€2.4M", label: "recovered" },
          { value: "0", label: "outages" },
        ],
        links: [
          {
            label: "Documentación de la API pública",
            url: `https://docs.${LONG_HOST}/v2/reference/inventory`,
          },
        ],
      },
      `Install with \`npx @northwind-industries-holdings-international/inventory-reconciliation-cli@latest --config=./northwind.config.json\`.

<span data-fact="regions">It reconciled stock for every region, from Thành phố Hồ Chí Minh to Las Palmas de Gran Canaria</span>.

| Región | Tiendas | SKUs | Pedidos/día | Devoluciones | Margen | Moneda | Zona horaria |
|---|---|---|---|---|---|---|---|
| Thành phố Hồ Chí Minh | 14 | 1,284,000 | 38,410 | 2.1% | 18.4% | VND | Asia/Ho_Chi_Minh |

\`\`\`js
const endpoint = "https://${LONG_HOST}/api/v2/inventory/reconcile?since=1999-12-31T00:00:00Z&include=all";
\`\`\`

![Arquitectura completa del sistema](${placeholderImage(4000, 12000, "Arquitectura")})`
    ),
    // Thai title with no spaces, RTL excerpt, leap day, no image, empty body.
    project("thai", {
      title: "ระบบจองตั๋วคอนเสิร์ตแบบไร้เงินสด",
      publishedAt: "2016-02-29",
      excerpt: "منصة لبيع التذاكر والدفع بدون تلامس في المهرجانات",
    }),
  ]);

const posts = () =>
  Promise.all([
    // Long title with a German compound, long unbreakable excerpt URL, broken image, and every markdown hazard.
    post(
      "webhook-retries",
      {
        title:
          "Why our Donaudampfschifffahrtsgesellschaftskapitänsmützenhersteller integration taught me more about retries, idempotency keys and webhook signatures than three years of greenfield work",
        publishedAt: "2026-11-02",
        excerpt: `We moved checkout to ${LONG_HOST}/api/v2/webhooks/stripe/payment_intent.succeeded and broke everything for a weekend. Here is what the logs said.`,
        type: "article",
        episode: "https://tokenizadospodcast.com/episodios/25-agentes-que-compran-por-ti-y-otras-ideas-terribles/",
        mainImage: {
          src: "/images/blog/does-not-exist.jpg",
          alt: "Dashboard showing 1,284,000+ failed webhook deliveries over a weekend in late October",
        },
      },
      `Inline \`const veryLongIdentifierNameThatNeverBreaks = await fetchAllWebhookDeliveriesForMerchantAccount(merchantId)\`.

Bare URL: https://${LONG_HOST}/api/v2/webhooks/stripe/payment_intent.succeeded?merchant=acct_1PqRsTuVwXyZ

## Donaudampfschifffahrtsgesellschaftskapitänsmützenhersteller

<span data-fact="retries">Every webhook was retried 1,284,000+ times over one weekend</span>.

\`\`\`ts
export const handler = async (event: StripeWebhookEvent, context: WorkerContext): Promise<Response> => { return new Response(JSON.stringify({ received: true, id: event.id, type: event.type }), { status: 200 }); };
\`\`\`

| Endpoint | Region | p50 latency | p99 latency | Error rate | Retries | Idempotency key | Last deploy |
|---|---|---|---|---|---|---|---|
| ${LONG_HOST} | eu-west-1 | 120ms | 4,830ms | 12.4% | 1,284,000+ | idem_2024_10_27_checkout_v2 | 2024-10-27T23:59:59Z |

![Huge image](/images/blog/appcenter-bugsnag-hero.jpg)

> Tiếng Việt: Người dùng không thể thanh toán. ไทย: ผู้ใช้ไม่สามารถชำระเงินได้ العربية: لا يستطيع المستخدم الدفع 🚀🔥`
    ),
    // Near-limit excerpt (198 of 200) with a long URL; title with a long unbreakable identifier.
    post(
      "taint",
      {
        title: "Why experimental_taintObjectReference broke our Server Components",
        publishedAt: "2026-11-01",
        excerpt: `We moved the customer portal at https://portal.${LONG_HOST} to React 19 and chased one misplaced taint call for weeks. The dead ends, and the one-line fix.`,
      },
      "One misplaced call."
    ),
    // German compound title; Arabic and Thai in the excerpt.
    post(
      "i18n",
      {
        title: "Internationalisierungsbibliothek",
        publishedAt: "2026-03-05",
        excerpt: "Notas sobre i18n: pluralización, árabe (العربية) y tailandés (ภาษาไทย).",
      },
      "Plurals are hard."
    ),
    // Future-dated, not a draft: sorts first. One-word title, one-character excerpt.
    post("ship", { title: "Ship", publishedAt: "2027-01-15", excerpt: "." }, "Shipped."),
    // Very far in the future, Thai and Arabic excerpt with emoji.
    post(
      "september",
      {
        title: "Notes from September",
        publishedAt: "2099-09-30",
        excerpt: "Thai and Arabic: ผู้ใช้ไม่สามารถชำระเงินได้ — لا يستطيع المستخدم الدفع 🚀",
      },
      "Later."
    ),
    // Short title, short excerpt, no image, no type, no episode.
    post("retries", { title: "Retries", publishedAt: "2026-10-30", excerpt: "Yes." }, "One line."),
    // Very old (Archive), first day of the year: in a timezone west of UTC it shows as 1998.
    post(
      "cnmc",
      {
        title: "Sentencias de la Comisión Nacional de los Mercados y la Competencia: interoperabilidad",
        publishedAt: "1999-01-01",
        excerpt: "Lo que dijo la CNMC sobre interoperabilidad en 1999.",
      },
      "Archivo."
    ),
  ]);

// Season 2 restarts numbering (so the count reads "1 episodes"), a title with a different
// separator (so the prefix isn't stripped), an entity inside CDATA, a late-night GMT date.
const podcast = () =>
  podcastFrom(
    [
      item({
        title:
          "Tokenizados #1: Qwen3-Coder-480B-A35B-Instruct, la Datenschutzgrundverordnung y #AprendizajePorRefuerzoProfundoMultiagente",
        number: 1,
        season: 2,
        pubDate: "Sat, 31 Oct 2026 23:45:00 GMT",
      }),
      item({
        title: "Tokenizados #26 - Especial: Entrevista con Trần Thị Ngọc Ánh sobre IA en Việt Nam 🇻🇳",
        number: 26,
        pubDate: "Sun, 27 Sep 2026 21:21:04 GMT",
      }),
      item({
        title: "Tokenizados #25: OpenAI &amp; Anthropic: ¿quién gana?",
        number: 25,
        pubDate: "Sat, 19 Sep 2026 16:39:58 GMT",
      }),
      item({ title: "Tokenizados #24: Older", number: 24, pubDate: "Sat, 12 Sep 2026 10:00:00 GMT" }),
    ].join("\n"),
    `<a href="/episodios/26-especial-entrevista-tran-thi-ngoc-anh/">#26</a>`
  );

const roles: Role[] = [
  // Current (no end), empty impact, long title, long company with a long-hostname url.
  {
    id: "northwind",
    company: "Northwind Industries Holdings International",
    title: "Senior Staff Software Engineer, Developer Experience & Platform",
    start: "September 2026",
    impact: [],
    url: `https://${LONG_HOST}`,
  },
  // A German compound Fact, used as a long chip label.
  {
    id: "aios",
    company: "AIOS",
    title: "Co-founder",
    start: "2025",
    end: "Aug 2026",
    impact: [
      "Took on ",
      { fact: "ownership", text: "Produktentwicklungsverantwortlichkeitenübernahme" },
      " in AI teams.",
    ],
  },
  // Long company, no url, an unbreakable package name as a Fact.
  {
    id: "sejas-labs",
    company: "Laboratorio de Inteligencia Artificial Aplicada de Canarias",
    title: "Co-founder",
    start: "Mar 2020",
    end: "Mar 2024",
    impact: [
      "Shipped ",
      { fact: "sdk", text: "@northwind/experimental-server-components-runtime-instrumentation" },
      " used by 1,284,000+ developers.",
    ],
  },
  // One-letter company and title, single-year dates.
  { id: "q", company: "Q", title: "CTO", start: "2017", end: "2017", impact: "Built it." },
  // Very old.
  {
    id: "secret-source",
    company: "Secret Source",
    title: "Software Developer",
    start: "Jan 1999",
    end: "Oct 2018",
    impact: ["My first job, where I ", { fact: "react", text: "started with React and React Native" }, "."],
    url: "https://secretsourcestudio.example.com",
  },
];

const about: Prose[] = [
  [
    "I'm Jorge, Trần Thị Ngọc Ánh's colleague ",
    { fact: "place", text: "in Las Palmas de Gran Canaria" },
    ". I've spent ",
    { fact: "experience", text: "the last nine years at Rechtsschutzversicherungsgesellschaften and elsewhere" },
    ". You'll also find me at https://" + LONG_HOST + "/team/jorge-masta.",
  ],
  "Hablo español, English, und ein bisschen Deutsch. هذا نص عربي في فقرة إنجليزية. 🚀",
];

const user = (id: string, text: string): UIMessage => ({ id, role: "user", parts: [{ type: "text", text }] });
const assistant = (id: string, text: string): UIMessage => ({
  id,
  role: "assistant",
  parts: [{ type: "text", text }],
});

// Ten questions (the Worker's limit, so the next one fails), ending with a spaceless question
// whose Focus label cut lands in the middle of an emoji, answered with twelve chips.
const conversation: UIMessage[] = [
  user(
    "u1",
    `Can you check https://${LONG_HOST}/careers/senior-product-engineer-frontend-ai?utm_source=linkedin and tell me if Jorge fits?\n\nAlso: does he do React Native?`
  ),
  assistant(
    "a1",
    "Yes: Jorge published his MCP server at https://www.npmjs.com/package/@rechtsschutz/mcp-server [[rechtsschutz|An MCP server agents can call for insurer data]]. He also wrote about retries [[webhook-retries|Webhook retries, the long version]], and his news digest [[destilados/sources|How he condenses dozens of sources]]."
  ),
  user("u2", "Hat Jorge Erfahrung als Produktentwicklungsverantwortlicher in KI-Teams? 🤖"),
  assistant(
    "a2",
    "Ja, als Produktentwicklungsverantwortlichkeitenübernahme bei AIOS [[aios|KI-native Organisationen aufgebaut]] [[aios/ownership|Team beim Programmieren mit KI begleitet]]."
  ),
  user("u3", "هل عمل خورخي على منتجات الذكاء الاصطناعي؟"),
  assistant("a3", "نعم، يقدّم خورخي بودكاست Tokenizados [[episode-26|حلقة عن وكلاء الذكاء الاصطناعي]]."),
  user("u4", "Jorge đã xây dựng những sản phẩm trí tuệ nhân tạo nào trong năm nay?"),
  // Reasoning only, no text: what a stream cut off mid-thought leaves behind.
  { id: "a4", role: "assistant", parts: [{ type: "reasoning", text: "…thinking…" }] },
  user("u5", "Hi"),
  // Only an id that no longer exists: renders as nothing.
  assistant("a5", "[[padelful-old-id]]"),
  user("u6", "?"),
  assistant("a6", "Jorge is building Padelful [[padelful|What he is building right now]]."),
  user("u7", "What about Ứng?"),
  assistant("a7", "Ứng is a Vietnamese learning app [[ung|Ứng]]."),
  user("u8", "And X?"),
  assistant("a8", "X is dated 2099 [[x]]."),
  user("u9", "Anything in Thai?"),
  assistant("a9", "Yes [[thai|ระบบจองตั๋วคอนเสิร์ตแบบไร้เงินสด]]."),
  user("u10", "Jorge在人工智能产品方面做过哪些工作？他是否熟悉React和ReactNative开发和MCP服务器构建🤖🤖他用过哪些模型？"),
  assistant(
    "a10",
    [
      "他做过很多：",
      "[[destilados/sources|每天阅读几十个来源]]",
      "[[rechtsschutz/matcher|每晚匹配一百多万条保单]]",
      "[[padelful/agent|代理调查模糊的商品]]",
      "[[ung]]",
      "[[x]]",
      "[[webhook-retries/retries]]",
      "[[taint]]",
      "[[aios/ownership]]",
      "[[sejas-labs/sdk|发布了一个开发者SDK]]",
      "[[northwind]]",
      "[[episode-1]]",
      "[[about/place]]",
    ].join(" ")
  ),
];

export default async function worst(): Promise<DevData> {
  return {
    posts: await posts(),
    projects: await projects(),
    podcast: podcast(),
    roles,
    about,
    conversation,
    focusStep: 11,
  };
}
