# UniShack UCLA Scraper

Local-first scraper/import pipeline for the permitted UCLA apartment pages at:

```text
https://www.unishack.com/ucla/apartments
```

The scraper uses the visible page `ItemList` JSON-LD as the discovery source, then fetches each direct apartment URL under `/ucla/apartment/<slug>`. It intentionally avoids `/api/` endpoints and does not use the broader UniShack sitemap.

## Commands

```bash
npm run unishack:test
npm run unishack:discover -- --expect-count 359
npm run unishack:scrape -- --concurrency 4
npm run unishack:scrape -- --limit 10 --out scrape-output/unishack-ucla-smoke
```

Generated scraper output is ignored under `scrape-output/`:

- `discovered.json`
- `normalized.json`
- `validation-report.json`
- `summary.json`

## Supabase Setup

Apply the migration in `supabase/migrations/20260528213813_unishack_ucla_ingestion_schema.sql` before import.

Create a local `.env` from `.env.example`:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_STORAGE_BUCKET=listing-media
```

The service role key is only for local/server import commands. Do not put it in Expo, React Native, or any `NEXT_PUBLIC_` environment variable.

Mirror images, then import:

```bash
npm run unishack:mirror-images -- --input scrape-output/<run>/normalized.json
npm run unishack:import -- --input scrape-output/<run>/normalized.mirrored.json
```

Dry-run the import shape without writing to Supabase:

```bash
npm run unishack:import -- --input scrape-output/<run>/normalized.json --dry-run
```

## Data Handling

- Hidden phone/email fields from UniShack's React payload are not persisted.
- Visible manager display names are stored as `manager_display_name`.
- `$0` rent is normalized to `null` and recorded as a quality warning.
- Placeholder images are skipped.
- Image failures are recorded per image and do not fail the property scrape.
- Units keep the source unit ID and availability state so reruns are idempotent.
- `listing_search_index.active` is true only when the property has at least one available unit.
