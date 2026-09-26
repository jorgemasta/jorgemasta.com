# Deployed to Cloudflare Workers, with the DNS zone on Cloudflare

The site is a static Astro build served by Cloudflare Workers static assets,
configured by a committed `wrangler.jsonc`. Cloudflare Pages was the simpler
option, but Workers is where Cloudflare steers new projects and it leaves room
for an API route or middleware on the domain later.

Choosing Workers forces the DNS decision: a Worker is bound to a route on a
Cloudflare-managed zone, so `jorgemasta.com` moved to Cloudflare nameservers.
The domain is still registered at Namecheap — renewal, transfer lock and WHOIS
stay there — but **every DNS record is now edited in Cloudflare**, and records
left behind in Namecheap's panel are ignored. The zone was three records (apex,
`www`, a `_dmarc` TXT) with no MX, so the move risked nothing email-related.

## Consequences

Cloudflare is now a single point of failure for both DNS and hosting. The
previous Netlify deployment is kept dormant as a rollback target with its custom
domain detached.
