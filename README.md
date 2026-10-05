# DataSage

DataSage is a CSV-only, AI-assisted analysis app for people who are comfortable with spreadsheets but do not use SQL or Python. It profiles uploaded data in the browser, calculates a dependable dashboard, and uses a compact profile to produce an AI briefing and answer plain-English questions.

## Run locally

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local`.
3. Add your OpenAI key as `OPENAI_API_KEY`. Keep this file private.
4. Run `pnpm dev`, then visit `http://localhost:3000`.

Without an API key, uploading and dashboarding still work; the AI briefing and question panel explain that setup is incomplete.

## Deploy to Vercel

1. Push this folder to a new GitHub repository.
2. Import the repository at [Vercel](https://vercel.com/new).
3. Add `OPENAI_API_KEY` and optional `OPENAI_MODEL` as Vercel environment variables.
4. Deploy. Do not add `.env.local` to GitHub.

## Demo flow

Download the included sample on the upload screen, upload it, then ask: **Which product category generated the most revenue?** The app shows a deterministic dashboard immediately and the AI response cites only the compact profile sent to it.

## Version-one guardrails

- CSV only; up to 5 MB, 5,000 rows, and 25 columns.
- Uploaded files are parsed in the browser and not saved by the app.
- AI routes receive aggregated summaries plus a maximum 20-row representative sample—not the original file.
- This is a demo-safe tool: users should not upload confidential, personal, or regulated data.
