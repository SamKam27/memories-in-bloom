# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build (`vite build`)
- `npm run lint` — Run ESLint (flat config, v9+)
- `npm run preview` — Preview production build locally

No test framework is configured. Validate changes with `npm run build` and `npm run lint`.

## Environment Variables

The app requires two Vite env vars (see `.env.example`):

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous API key

The app throws on startup if either is missing. These are accessed via `import.meta.env` in `src/api/supabase.js`.

## Architecture

**Memories in Bloom** is a family photo gallery app where members can view photos, add text notes, and record audio memories. React 19 + Vite 8 + React Router 7 frontend with a Supabase backend (auth, storage, PostgreSQL via REST API).

### Project Structure

```
src/
├── main.jsx                    # Entry point: StrictMode + renders App
├── index.css                   # Minimal reset (all styles in styles/)
├── App.jsx                     # BrowserRouter → AuthProvider → AppShell
│                               #   AppShell: PhotosProvider + RequireAuth + Routes
├── api/supabase.js             # mkApi factory + singleton + constants (CATS, IMAGE_EXTS)
├── hooks/
│   ├── useAuth.jsx             # AuthContext/Provider + useAuth hook
│   ├── usePhotos.jsx           # PhotosContext/Provider + usePhotos hook
│   ├── useAudioRecorder.js     # MediaRecorder wrapper hook
│   └── usePhotoUpload.js       # Upload form state machine hook
├── components/
│   ├── Icon.jsx                # <Ic d={path} s={size} c={color} /> + icon path map
│   ├── Header/                 # Sticky header (80px), nav, sign-in/out, upload trigger
│   ├── LoginModal/             # Email + password sign-in modal
│   ├── UploadModal/            # Drag-drop photo upload with progress bar
│   ├── PhotoCard/              # Gallery card (image + title + badges, links to detail)
│   ├── NoteEditor/             # Notes list + text editor + audio list + recorder
│   └── AudioRecorder/          # Start/stop recording + preview + save controls
├── pages/
│   ├── GalleryPage/            # Hero + category filter bar + photo grid
│   ├── PhotoDetailPage/        # Full image + delete + NoteEditor
│   └── TutorialPage/           # 6-step how-to guide
├── utils/format.js             # fmt(seconds→MM:SS), fmtDate(date→"Month Day, Year")
├── styles/
│   ├── global.css              # CSS vars, reset, fonts, shared layout, .hero, .loading
│   ├── buttons.css             # .btn base + variants (.bp, .bg, .bd, .bs, .bo, .blg, .bsm)
│   └── modal.css               # .overlay, .modal, .finput, .flabel, .ferr, .macts
└── assets/                     # hero.png, react.svg, vite.svg
```

### Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | GalleryPage | Category filter bar + photo card grid |
| `/photo/:id` | PhotoDetailPage | Full image + notes + audio recorder |
| `/tutorial` | TutorialPage | 6-step how-to guide |

### Provider Hierarchy

```
BrowserRouter
  └─ AuthProvider           (session, signIn, signOut, login modal state)
       └─ AppShell          (upload modal state)
            └─ PhotosProvider   (photos[], loading, CRUD mutations)
                 └─ RequireAuth (gates content behind sign-in prompt)
                      └─ Routes
```

### Key Patterns

- **`api/supabase.js`** — `mkApi(url, key)` factory returns a plain object with methods for all Supabase REST calls (no SDK). Custom `hd()` helper builds auth headers. Exported singleton `api` is used throughout. Also exports `CATS` (category list), `IMAGE_EXTS`, and `titleFromFilename()`.
- **React Context** — `AuthProvider` (session, sign in/out, login modal) and `PhotosProvider` (photos array, loading, CRUD + storage sync). No external state library.
- **Custom hooks** — `useAudioRecorder` (MediaRecorder + refs + timer, cleanup on unmount), `usePhotoUpload` (upload form state + progress + drag-drop).
- **CSS** — Co-located `.css` files per component/page. Shared design tokens in `styles/global.css`. No CSS-in-JS, no CSS Modules, no Tailwind. Use existing CSS variables and class conventions.
- **Components** — Functional components only. Short prop names (e.g., `d`, `s`, `c` for Icon). State managed via hooks and context, no class components.

### API Layer (`api/supabase.js`)

The `api` object exposes these methods:

| Method | Purpose |
|--------|---------|
| `publicUrl(bucket, path)` | Generate public storage URL |
| `signIn(email, password)` | Authenticate, returns session token |
| `getPhotos()` | Fetch all photos with joined notes + audio_notes |
| `addNote(photoId, text, token)` | Create text note |
| `deleteNote(id, token)` | Delete text note |
| `uploadAudio(photoId, blob, token)` | Upload webm audio to storage |
| `addAudioNote(photoId, path, label, token)` | Create audio note record |
| `deleteAudioNote(id, path, token)` | Delete audio note + storage file |
| `uploadPhoto(file, token)` | Upload image to storage |
| `addPhoto(title, category, path, token)` | Create photo record |
| `deletePhoto(id, token)` | Delete photo record |
| `listStorageFiles(bucket, prefix, token)` | List files in storage bucket |
| `syncPhoto(title, category, path, token)` | Create photo record (used by sync) |

### Database Schema

Three tables:
- `photos` — id, title, category, storage_path
- `notes` — photo_id (FK), text, created_at
- `audio_notes` — photo_id (FK), storage_path, label

Two storage buckets: `photos`, `audio-notes`.

### Styling Conventions

**CSS Variables** (defined in `styles/global.css`):
- Colors: `--cr` (cream bg), `--cw` (white), `--cd` (dark brown), `--cm` (medium brown), `--cl` (light brown), `--cg` (gold/primary), `--cgl` (light gold), `--cs` (sand), `--csl` (light sand), `--cgr` (green), `--crd` (red/delete)
- Shadows: `--sh` (soft), `--shd` (dark)
- Fonts: `--fd` (Playfair Display — headings), `--fb` (Lora — body)

**Button classes** (in `styles/buttons.css`):
- `.btn` base + size variants (`.blg`, `.bsm`) + color variants (`.bp` gold primary, `.bg` ghost, `.bd` red delete, `.bs` green save, `.bo` outline)

**Breakpoint**: 640px (mobile). Use `@media (max-width: 640px)` for responsive rules.

## Conventions

- **ES modules** — `"type": "module"` in package.json, use `import`/`export` throughout
- **JSX files** — `.jsx` extension for all React components, `.js` for non-JSX utilities/hooks
- **File organization** — Components and pages in folders with co-located CSS (e.g., `Header/Header.jsx` + `Header/Header.css`)
- **No TypeScript** — Plain JavaScript with JSDoc-style hints via `@types/react` dev dependency for IDE support
- **Naming** — Short CSS variable names (2-3 chars), short prop names in internal components, descriptive function names in hooks/API
- **Auth pattern** — Token passed explicitly to API methods; obtained via `useAuth().session?.access_token`
- **State updates** — `updatePhoto(id, fn)` takes an updater function to immutably patch a photo in the photos array
