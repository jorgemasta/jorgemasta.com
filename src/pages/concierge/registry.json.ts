import { getRegistry } from "../../lib/content";

/**
 * The target registry, built with the site: the Concierge's Worker reads it as
 * its corpus and the client uses it to resolve an id to a page and anchor.
 */
export async function GET() {
  return Response.json(await getRegistry());
}
