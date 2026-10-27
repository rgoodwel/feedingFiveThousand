# Feeding Five Thousand

A device-agnostic group meal planning app for projects/events with reusable attendee lists, meal planning, dietary summaries, and food sign-ups.

## Features

- Multiple projects/events in the same app
- Independent meal tracking per project and meal
- Project visibility modes:
  - fully public
  - public with password
  - private with password
- Reusable attendee directory with dietary restrictions
- Meal date, time, category, attendee count, and dietary summary
- Meal items with name, description, category, and person responsible
- Admin-only delete actions for projects and meals
- Two-step confirmation before deleting meal items
- No auth layer; access is controlled by project visibility and password logic

## Supabase setup

1. Create a new Supabase project on the free tier.
2. Open the project settings and copy the project URL and anon/public key.
3. Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

4. Replace the placeholder values in `.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Open the Supabase SQL editor and run the schema from [supabase/schema.sql](supabase/schema.sql).

## Local development

```bash
npm install
npm run dev -- --host 0.0.0.0
```

## Production build

```bash
npm run build
```

## Security note

This app intentionally uses the Supabase anonymous/public key and does not implement user authentication. Visibility and password checks are handled at the project level so the app fits the no-auth free-tier model you requested.
