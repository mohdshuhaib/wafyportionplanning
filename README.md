# Wafy Portion Planning

Mobile-first portion planning for Wafy Campus Kalikavu, built with Next.js, TypeScript, Tailwind CSS, Framer Motion and Supabase.

## Setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
2. Copy `.env.example` to `.env.local` and fill in the project URL and **service role** key. Never expose that key with a `NEXT_PUBLIC_` prefix or commit it.
3. Run `npm install`, then `npm run dev`.

All browser data access goes through validated Next.js route handlers. Database tables reject direct anonymous access. Unique constraints and version-checked weekly saves protect concurrent edits; a stale editor receives a conflict rather than silently overwriting newer data.

If the database was created from an earlier version of this project, run `supabase/migrate-calendar-to-manual.sql` once. The calendar is a permanent month/day template, so its manually selected holidays apply every year and February always includes date 29.

## Deployment

Add the same two environment variables to Vercel (or your host), deploy, and keep the service role key server-only. Because the requested app has no authentication, anyone who can reach the deployed site can use its UI and server endpoints; restrict the deployment at the network/platform layer if the site must remain campus-only.
