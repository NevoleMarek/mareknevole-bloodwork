# bloodwork.mareknevole.com

A public dashboard for tracking personal blood work over time. Better decisions come from better data — structured lab results, supplements, and health metrics, all in one place and open for anyone to learn from.

## Stack

- Next.js 16 compiled by OpenNext for Cloudflare Workers
- Alchemy v2 and Effect 4 own the production Worker, bindings, secrets, domain, and URL output
- Cloudflare D1 database
- Tailwind CSS 4
- Recharts
- Vitest + Testing Library

## SEO

The following SEO infrastructure is in place:

| File                       | Purpose                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `app/layout.tsx`           | Open Graph, Twitter Card (`summary`), canonical URL, `robots` directives, meta description |
| `app/robots.ts`            | `robots.txt` — allows `/`, disallows `/admin` and `/api`                                   |
| `app/sitemap.ts`           | XML sitemap for `/` (weekly changeFrequency)                                               |
| `app/favicon.ico`          | Favicon                                                                                    |
| `app/layout.tsx` (JSON-LD) | `WebApplication` schema with author link back to mareknevole.com                           |

### Structured data

```json
{
  "@type": "WebApplication",
  "name": "Bloodwork",
  "applicationCategory": "HealthApplication",
  "url": "https://bloodwork.mareknevole.com",
  "author": {
    "@type": "Person",
    "name": "Marek Nevole",
    "url": "https://mareknevole.com"
  }
}
```

### Future improvements

- Dedicated OG image (1200x630) for richer social sharing previews
- `icon.svg` alongside existing `favicon.ico`
- Apple touch icon

## Development

```sh
bun install
bun run dev
```

## Verification

```sh
bun run check        # fast: format + lint + typecheck + test
bun run check:full   # fast suite + OpenNext Worker build + deployment contract
```

## Deploy

```sh
bun run build:worker
bun run verify:deployment
bun run plan:production
```

`wrangler.dev.jsonc` supports local Next and D1 development only. It is not a production deployment manifest.

The first production migration is intentionally manual. Review the plan, confirm that D1 name `bloodwork-db` has existing database ID `59c89aab-650f-4814-9182-dc6691e74237` and KV title `NEXT_INC_CACHE_KV` has existing namespace ID `3ce48886bf744930a9e9114f7c707019`, then run `bun alchemy deploy --stage prod --adopt` with `ADMIN_PASSWORD` and `GEMINI_API_KEY` supplied locally. No deploy occurs as part of this repository change.

See [the deployment rationale](docs/effect-alchemy-rationale.md) for the exact shape and tradeoffs.
