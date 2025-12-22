# Repository Guidelines

## Project Structure & Module Organization
- `src/app` contains the Next.js App Router pages and API routes (e.g., cron and admin endpoints).
- `src/components` holds reusable UI components.
- `src/services` encapsulates data fetchers and domain logic (ESPN, odds, weather, injuries, Elo).
- `src/lib` and `src/types` contain shared utilities and type definitions.
- `public` hosts static assets.

## Build, Test, and Development Commands
- `npm run dev`: start the local Next.js dev server at `http://localhost:3000`.
- `npm run build`: produce a production build.
- `npm run start`: run the production build locally.
- `npm run lint`: run ESLint with Next.js core-web-vitals and TypeScript rules.

## Coding Style & Naming Conventions
- TypeScript + React with strict type checking (`tsconfig.json`).
- Use 2-space indentation and single quotes (see `src/app/page.tsx`).
- Prefer descriptive, domain-driven names (e.g., `weather.ts`, `odds.ts`, `elo.ts`).
- Keep new utilities in `src/lib` and shared types in `src/types`.

## Testing Guidelines
- No dedicated test suite is present yet. If you add tests, document the runner and add a script in `package.json`.
- Name tests by feature and file (example: `src/services/elo.test.ts`).

## Commit & Pull Request Guidelines
- Commit messages follow short, imperative summaries (e.g., “Add…”, “Fix…”, “Replace…”).
- PRs should include: a clear description of changes, any linked issues, and screenshots for UI changes.
- Note any updates to cron behavior or prediction logic, and list required env vars or config changes.

## Security & Configuration Tips
- Store secrets in `.env.local` (never commit). See `CLAUDE.md` for required variables.
- When touching cron routes, confirm `CRON_SECRET` usage and Vercel Cron schedules.
