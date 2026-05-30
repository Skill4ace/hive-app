# Hive

Hive is a mobile app for college students finding shared housing near campus. It makes apartment hunting collaborative around campus, commute, budget, and roommate fit. Currently lists properties near UCLA.

## Stack

- **Expo SDK 56** with the new architecture and React Compiler
- **Expo Router** — file-based routing with typed routes
- **React 19** / **React Native 0.85**
- **Supabase** — Postgres, Row Level Security, and storage for listing media
- **react-native-maps**, **Reanimated**, **Gesture Handler**
- **expo-sqlite** for local session/state persistence

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable | Used by | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | App | Public Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | App | Public/anon key shipped with the client |
| `SUPABASE_URL` | Scripts | Project URL for ingestion scripts |
| `SUPABASE_PUBLISHABLE_KEY` | Scripts | Public key for ingestion scripts |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts | Server-only key — never ship in the app |
| `SUPABASE_STORAGE_BUCKET` | Scripts | Listing media bucket (`listing-media`) |

Only the `EXPO_PUBLIC_*` keys are bundled into the app. Service-role and other secrets are used solely by the local ingestion scripts.

### 3. Start the app

```bash
npm start        # Expo dev server
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web
```

## Project structure

```text
src/
  app/                 # Expo Router routes (file-based)
    (app)/             # Authenticated app shell + five tabs
      discover.tsx     #   Swipe through listings
      map.tsx          #   Compare listings by distance to campus
      saved.tsx        #   Liked apartments and shared matches
      groups.tsx       #   Create or join a roommate group
      profile.tsx      #   Preferences, account, notifications
    (auth)/            # Sign-in and onboarding flow
    listing/[id].tsx   # Listing detail
    group/[id].tsx     # Group detail
  components/          # Shared primitives + housing components
  constants/theme.ts   # Color, typography, spacing tokens
  hooks/               # Theme + data hooks
  lib/                 # Supabase client, app + group state
  data/                # Listing and demo data
supabase/migrations/   # Database schema, RLS policies, group matching
scripts/unishack/      # Listing ingestion pipeline
```

## Navigation

The core experience is a five-tab bar:

- **Discover** — swipe through listings and open detail views
- **Map** — compare listings by distance to campus and neighborhood
- **Saved** — review liked apartments and shared matches
- **Groups** — create or join a roommate group
- **Profile** — edit preferences, account, notifications, and privacy

## Listing ingestion

Listings are sourced through the `unishack` pipeline. Each step is a separate script:

```bash
npm run unishack:discover       # Find listing URLs
npm run unishack:scrape         # Scrape listing details
npm run unishack:mirror-images  # Mirror images into Supabase storage
npm run unishack:import         # Import into the database
npm run unishack:test           # Test the parser
```

See [`docs/unishack-ucla-scraper.md`](docs/unishack-ucla-scraper.md) for details.

## Database

Schema, RLS policies, and group-matching logic live in [`supabase/migrations/`](supabase/migrations/). RLS is enabled on all exposed tables: listing data is readable while user decisions and group votes stay private to their members. See [`docs/database-schema-research.md`](docs/database-schema-research.md) for background.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` / `android` / `web` | Launch on a target platform |
| `npm run lint` | Lint with `expo lint` |
| `npm run reset-project` | Reset to a blank starter (moves current code aside) |
