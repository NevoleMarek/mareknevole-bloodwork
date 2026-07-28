# bloodwork.mareknevole.com

A public dashboard for tracking personal blood work over time. Better decisions come from better data — structured lab results, supplements, and health metrics, all in one place and open for anyone to learn from.

## Stack

- Next.js 16 (OpenNext on Cloudflare Workers)
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
bun run check:full   # full suite
```

## Deploy

```sh
bun run deploy
```
