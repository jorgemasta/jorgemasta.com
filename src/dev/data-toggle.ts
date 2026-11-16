import type { AstroIntegration } from "astro";
import type { Plugin } from "vite";
import { DATA_COOKIE, DATA_PARAM, getDataMode, isDataMode, setDataMode, type DataMode } from "./data-mode";

/**
 * DEV ONLY. Lets `astro dev` render the site with break-ui fixtures:
 * `?data=demo|worst|empty|one`, remembered in a cookie so reloads and
 * navigation keep it. Does nothing for `astro build`.
 *
 * Astro hands prerendered pages a request without its query string or
 * headers, even in dev, so the choice is read here, from the raw request,
 * before Astro renders the page.
 */
export default function dataToggle(): AstroIntegration {
  return {
    name: "dev-data-toggle",
    hooks: {
      "astro:config:setup": ({ command, updateConfig }) => {
        if (command !== "dev") return;
        updateConfig({ vite: { plugins: [plugin()] } });
      },
    },
  };
}

const cookieValue = (header: string | undefined, name: string) =>
  header
    ?.split(";")
    .map((pair) => pair.trim().split("="))
    .find(([key]) => key === name)?.[1];

function plugin(): Plugin {
  return {
    name: "dev-data-toggle",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const param = url.searchParams.get(DATA_PARAM);
        const cookie = cookieValue(req.headers.cookie, DATA_COOKIE);

        if (isDataMode(param) && param !== cookie) {
          res.setHeader("Set-Cookie", `${DATA_COOKIE}=${param}; Path=/; SameSite=Lax`);
        }
        const mode: DataMode = isDataMode(param) ? param : isDataMode(cookie) ? cookie : "demo";

        if (mode !== getDataMode()) {
          setDataMode(mode);
          // getStaticPaths results are cached per route; Astro drops them on this event.
          for (const [name, environment] of Object.entries(server.environments)) {
            if (name !== "client") environment.hot.send("astro:content-changed", {});
          }
        }
        next();
      });
    },
  };
}
