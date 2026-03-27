# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build (`vite build`)
- `npm run lint` — Run ESLint
- `npm run preview` — Preview production build locally

No test framework is configured.

## Architecture

**Memories in Bloom** is a family photo gallery app where members can view photos, add text notes, and record audio memories. React 19 + Vite 8 frontend with a Supabase backend (auth, storage, PostgreSQL).

### Single-component design

The entire UI lives in `src/App.jsx` (~850 lines). There are no separate component files. All views (setup, gallery, photo detail, tutorial) are conditionally rendered within this one component.

### Key patterns

- **`mkApi(url, key)`** — Factory function that returns an API wrapper object for all Supabase REST calls (auth, photos CRUD, notes, audio notes, storage URLs). All backend communication goes through this.
- **`injectStyles()`** — All CSS (~2400 lines) is defined as a template string inside App.jsx and injected into the DOM dynamically. `App.css` and `index.css` are minimal.
- **Supabase config in localStorage** — The app stores Supabase URL and anon key in `localStorage` under `sb-cfg`. A setup screen handles initial configuration.
- **Audio recording** — Uses the MediaRecorder API to capture WebM audio, managed via refs (`mediaRecRef`, `chunksRef`, `timerRef`).

### Database schema

Three tables: `photos` (id, title, category, storage_path), `notes` (photo_id FK, text), `audio_notes` (photo_id FK, storage_path, label). Two storage buckets: `photos`, `audio-notes`.

### Styling

Warm color palette (browns, golds, greens). Fonts: Playfair Display (headers), Lora (body). Mobile breakpoint at 640px.
