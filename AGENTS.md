# Repository Guidelines

## Project Structure & Module Organization
Next.js App Router routes live in `app/`; keep them server components and only add `'use client'` when browser APIs are required. Shared UI resides in `components/`, reusable logic and API clients land in `lib/`, and contracts stay in `types/` via the `@/*` alias. Automation scripts (`scripts/`), the Python XGBoost toolchain (`training/`), static assets (`public/`), and Firebase deployment files (`firebase.*`) round out the workspace.

## Build, Test, and Development Commands
Use `npm run dev` for local work and `npm run build && npm run start` to reproduce the production bundle. `npm run lint` must succeed before any commit, while `npm run backtest` (`tsx scripts/backtestAllWeeks.ts`) should accompany prediction changes to keep ROI CSVs synced. Refreshing data relies on `npm run scrape-standings`, `npm run build-historical-standings`, and when retraining models run `cd training && pip install -r requirements.txt && python train_model.py data.json`.

## Coding Style & Naming Conventions
The repo enforces strict TypeScript, so annotate exported functions, prefer `const`, and keep async code in `await` form. Follow the prevailing two-space indentation, PascalCase component files, camelCase hooks/utilities, and kebab-case route folders to match `app/page.tsx`. Styling belongs to Tailwind utility classes; if a pattern repeats, promote it into a `components/` abstraction rather than introducing ad-hoc CSS.

## Testing Guidelines
Treat `npm run lint` plus `npm run backtest` as the minimum regression gate and note ROI deltas in your PR description. Lightweight checks such as `node test_analytics.js` are fine; name new helpers `<feature>.test.ts` or `.py` and keep fixtures beside the code that uses them. Mock external APIs locally (Odds, Weather, Firebase) before running scripts so you preserve quotas and can rerun scenarios deterministically.

## Commit & Pull Request Guidelines
Commits should be single-purpose, imperative sentences similar to "Improve predictions page layout with side-by-side bet comparison" and include any regenerated assets. Pull requests need a short narrative, the commands you executed (`npm run lint`, `npm run backtest`, etc.), and screenshots whenever UI changes are visible. Rebase on `main`, ensure `npm run build` passes, and request reviews from both UI and data maintainers when edits span TypeScript and Python files.

## Security & Configuration Tips
Do not commit `.env.local`; base new secrets on `.env.example` and store the real values in your vault of choice. Rotate Firebase keys if automation runs from a new machine, and strip sportsbook or API credentials from logs, CSVs, and screenshots before sharing them externally.
