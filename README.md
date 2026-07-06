# AlliDesk Prototype

Marketing website: https://allidesk.co.za

Web app: https://app.allidesk.co.za

## Supabase Connection

The app includes a Supabase client and a connection test, but the current UI still uses mock/local prototype data until we intentionally connect live workflows.

1. Copy `.env.example` to `.env.local`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project.
3. Add the same variables in Vercel project settings before deploying live Supabase features.

No tables, authentication, billing workflows, or file storage are connected yet. Do not load real patient data.

## Deployment Checklist

Before every deployment, update the **What's New** section in `src/App.tsx` so users can see the latest product changes inside Settings.

Each update should include:

- Release date
- Product area
- Short user-facing summary
