# BioStoreX Frontend

React 19 + Vite 7 + Tailwind CSS v4 + React Router 7.

See the [root README](../README.md) for the full project overview, API reference, and setup
instructions for both frontend and backend.

## Quick start

```bash
cp .env.example .env   # optional in dev — Vite proxies /api to localhost:8000
npm install
npm run dev
```

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Production build → `dist/`           |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint                           |

## Structure

See `src/` — organized into `pages/`, `components/{ui,layout,items,requests,ai}/`, `context/`,
`hooks/`, `services/`, and `utils/`. The root README has a full breakdown.
