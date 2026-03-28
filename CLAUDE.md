# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build (`vite build`)
- `npm run lint` — Run ESLint
- `npm run preview` — Preview production build locally

No test framework is configured.

## Architecture

**Memories in Bloom** is a family photo gallery app where members can view photos, add text notes, and record audio memories. React 19 + Vite 8 + React Router frontend with a Supabase backend (auth, storage, PostgreSQL).

### Project structure

```
src/
├── App.jsx                     # Router shell: Providers + Routes + layout
├── api/supabase.js             # mkApi factory + Supabase singleton + constants
├── hooks/
│   ├── useAuth.jsx             # AuthContext/Provider + useAuth hook
│   ├── usePhotos.jsx           # PhotosContext/Provider + usePhotos hook
│   ├── useAudioRecorder.js     # MediaRecorder custom hook
│   └── usePhotoUpload.js       # Photo upload form custom hook
├── components/
│   ├── Icon.jsx                # SVG icon component + icon path constants
│   ├── Header/                 # App header with nav
│   ├── LoginModal/             # Auth sign-in modal
│   ├── UploadModal/            # Photo upload modal
│   ├── PhotoCard/              # Gallery card (links to detail)
│   ├── NoteEditor/             # Notes list + text editor + audio section
│   └── AudioRecorder/          # Voice recording controls
├── pages/
│   ├── GalleryPage/            # Photo grid with category filters
│   ├── PhotoDetailPage/        # Single photo + notes + audio
│   └── TutorialPage/           # How-to guide
├── utils/format.js             # fmt() and fmtDate() helpers
└── styles/
    ├── global.css              # CSS vars, reset, fonts, shared layout
    ├── buttons.css             # .btn and all variants
    └── modal.css               # Overlay, modal, form input styles
```

### Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | GalleryPage | Filter bar + photo card grid |
| `/photo/:id` | PhotoDetailPage | Full image + notes + audio recorder |
| `/tutorial` | TutorialPage | 6-step how-to guide |

### Key patterns

- **`api/supabase.js`** — `mkApi(url, key)` factory returns an API wrapper for all Supabase REST calls. Exported singleton `api` is used throughout.
- **React Context** — `AuthProvider` (session state, sign in/out, login modal) and `PhotosProvider` (photos array, loading, CRUD mutations) wrap the app.
- **Custom hooks** — `useAudioRecorder` (MediaRecorder + refs + timer with cleanup on unmount), `usePhotoUpload` (upload form state + progress).
- **CSS files** — Styles extracted into co-located `.css` files per component/page, plus shared files in `styles/`. No CSS-in-JS, no CSS Modules.

### Database schema

Three tables: `photos` (id, title, category, storage_path), `notes` (photo_id FK, text), `audio_notes` (photo_id FK, storage_path, label). Two storage buckets: `photos`, `audio-notes`.

### Styling

Warm color palette (browns, golds, greens). Fonts: Playfair Display (headers), Lora (body). Mobile breakpoint at 640px.
