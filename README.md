# Anda

**What's happening in your city right now?** Anda puts venue events and plans opened by people on one map. There is no feed, only the map.

Pilot cities are İzmir and İstanbul; the map covers all of Europe. The app is in Turkish and English.

> Work in progress. Without a backend configured, the app runs on bundled sample events.

## Features

- Full-screen map with three zoom levels: clusters, category icons, rich markers (emoji bubble, avatar, venue badge)
- Category chips that count what is in view, quick jumps to the pilot cities
- Filter panel: time, category, type, price (default: today)
- Event card in a bottom sheet: time, venue, price, attendees, RSVP, report, share
- Create a plan, sign in, profile (name, language, sign out, delete account)

## Stack

- Expo SDK 58, React Native, TypeScript, Expo Router
- MapLibre with the OpenFreeMap style (no map account or key needed)
- `@gorhom/bottom-sheet`, Reanimated, supercluster
- Supabase: Postgres + PostGIS, Auth, row-level security, server-side RPCs (`supabase/migrations`)
- i18next (tr/en), zod

## Run it

MapLibre is a native module, so Expo Go does not work; use a development build.

```bash
npm install
npx expo run:android   # or: npx expo run:ios
```

To connect a backend, create a Supabase project, apply `supabase/migrations/0001_init.sql`, then copy `.env.example` to `.env` and fill in the project URL and the **anon / publishable** key. The `service_role` key never goes into the app.

The full plan is in [docs/MVP.md](docs/MVP.md) (Turkish).
