# AlliDesk Prototype

Marketing website: https://allidesk.co.za

Web app: https://app.allidesk.co.za

## Supabase Pilot Backend

The app includes a Supabase client and pilot schema, but the current UI still uses mock/local prototype data until we intentionally connect live workflows.

1. Copy `.env.example` to `.env.local`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project.
3. Add the same variables in Vercel project settings before deploying live Supabase features.
4. Run the SQL migration in `supabase/migrations/202607050001_initial_pilot_schema.sql`.

Pilot scope:

- tenants
- profiles
- practices
- therapists
- patients
- appointments
- services

Do not load real patient data yet. Billing and file uploads are not part of this pilot schema.

## Deployment Checklist

Before every deployment, update the **What's New** section in `src/App.tsx` so users can see the latest product changes inside Settings.

Each update should include:

- Release date
- Product area
- Short user-facing summary
