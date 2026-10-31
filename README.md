# ClipScope frontend

Frontend Milestone 1: a responsive React + TypeScript workspace shell, route structure, reusable UI states, and a centralized API client foundation.

## Run locally

```powershell
cd fronted
npm install
Copy-Item .env.example .env.local
npm run dev
```

The default public API base URL is `http://localhost:8000`. Override it with `VITE_API_BASE_URL` in `.env.local` if FastAPI is running elsewhere. Vite variables are public and must never contain provider credentials.

## Checks

```powershell
npm run lint
npm run typecheck
npm run build
```

## Search results

- Routes: Overview, New discovery, Search history, and Connections. Video results remain available from each search job.
- The Connections page and top bar read the real `GET /api/health` and `GET /api/brightdata/config` contracts.
- The search-job page reads persisted video decisions through the backend API. Select **All collected**, **Matching**, **Unverified**, or **Rejected** to inspect the corresponding `search_job_videos` rows; all collected decisions are shown by default.
- CSV and JSON exports use the selected decision filter and search text. JSON exports download as `.json` files.
- The results view displays 50 videos per page with thumbnails, views, likes, comments, shares, saves, upload date, creator ID/profile, and region when provided.
- The frontend never calls Bright Data directly and does not expose the provider token.

Next milestones can add authentication and real search creation when the backend API contract supports them, followed by job progress, results, and export.
