import { useState, useRef, useEffect, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATS = ["All", "Family", "Garden", "Holidays", "Places", "Travel", "Other"];
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif", "svg", "bmp", "tiff", "tif"]);
const titleFromFilename = (name) =>
  name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim() || "Untitled";

// ─── Supabase API ─────────────────────────────────────────────────────────────
const mkApi = (projectUrl, anonKey) => {
  const base = projectUrl.replace(/\/$/, "");
  const hd = (token, json = true) => ({
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    ...(json && { "Content-Type": "application/json" }),
  });
  return {
    publicUrl: (bucket, path) => `${base}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`,
    async signIn(email, password) {
      const r = await fetch(`${base}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: hd(null), body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error_description || d.msg || "Sign-in failed");
      return d;
    },
    async getPhotos() {
      const r = await fetch(
        `${base}/rest/v1/photos?select=*,notes(*),audio_notes(*)&order=created_at.desc`,
        { headers: hd(null) }
      );
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || `Load failed (${r.status})`); }
      return r.json();
    },
    async addNote(photoId, text, token) {
      const r = await fetch(`${base}/rest/v1/notes`, {
        method: "POST", headers: { ...hd(token), Prefer: "return=representation" },
        body: JSON.stringify({ photo_id: photoId, text }),
      });
      if (!r.ok) throw new Error("Failed to save note");
      return (await r.json())[0];
    },
    async deleteNote(id, token) {
      await fetch(`${base}/rest/v1/notes?id=eq.${id}`, { method: "DELETE", headers: hd(token) });
    },
    async uploadAudio(photoId, blob, token) {
      const path = `${photoId}/${Date.now()}.webm`;
      const r = await fetch(`${base}/storage/v1/object/audio-notes/${path}`, {
        method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${token}` }, body: blob,
      });
      if (!r.ok) throw new Error("Failed to upload audio");
      return path;
    },
    async addAudioNote(photoId, storagePath, label, token) {
      const r = await fetch(`${base}/rest/v1/audio_notes`, {
        method: "POST", headers: { ...hd(token), Prefer: "return=representation" },
        body: JSON.stringify({ photo_id: photoId, storage_path: storagePath, label }),
      });
      if (!r.ok) throw new Error("Failed to save audio note");
      return (await r.json())[0];
    },
    async deleteAudioNote(id, storagePath, token) {
      await fetch(`${base}/rest/v1/audio_notes?id=eq.${id}`, { method: "DELETE", headers: hd(token) });
      await fetch(`${base}/storage/v1/object/audio-notes/${storagePath}`, {
        method: "DELETE", headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      }).catch(() => {});
    },
    async uploadPhoto(file, token) {
      const ext = file.name.split(".").pop().toLowerCase();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const r = await fetch(`${base}/storage/v1/object/photos/${path}`, {
        method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${token}` }, body: file,
      });
      if (!r.ok) throw new Error("Failed to upload photo");
      return path;
    },
    async addPhoto(title, category, storagePath, token) {
      const r = await fetch(`${base}/rest/v1/photos`, {
        method: "POST", headers: { ...hd(token), Prefer: "return=representation" },
        body: JSON.stringify({ title, category, storage_path: storagePath }),
      });
      if (!r.ok) throw new Error("Failed to save photo");
      const d = await r.json();
      return { ...d[0], notes: [], audio_notes: [] };
    },
    async deletePhoto(id, token) {
      await fetch(`${base}/rest/v1/photos?id=eq.${id}`, { method: "DELETE", headers: hd(token) });
    },
    async listStorageFiles(bucket, prefix = "", token) {
      const r = await fetch(`${base}/storage/v1/object/list/${bucket}`, {
        method: "POST", headers: hd(token),
        body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }),
      });
      if (!r.ok) throw new Error(`Failed to list storage files (${r.status})`);
      return r.json();
    },
    async syncPhoto(title, category, storagePath, token) {
      const r = await fetch(`${base}/rest/v1/photos`, {
        method: "POST", headers: { ...hd(token), Prefer: "return=representation" },
        body: JSON.stringify({ title, category, storage_path: storagePath }),
      });
      if (!r.ok) return null;
      const d = await r.json();
      return { ...d[0], notes: [], audio_notes: [] };
    },
  };
};

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables");
}
const api = mkApi(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// ─── Styles ───────────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("mib-styles")) return;
  const el = document.createElement("style");
  el.id = "mib-styles";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    :root{
      --cr:#FDF6E9;--cw:#FEFCF7;--cd:#2C1A0E;--cm:#5C3D1E;--cl:#8B5E3C;
      --cg:#C49A2C;--cgl:#E8C86A;--cs:#D4A96A;--csl:#F0DDB8;
      --cgr:#3D6B4F;--crd:#8B2B2B;--sh:rgba(44,26,14,.15);--shd:rgba(44,26,14,.3);
      --fd:'Playfair Display',Georgia,serif;--fb:'Lora',Georgia,serif;
    }
    body{background:var(--cr);color:var(--cd);font-family:var(--fb);font-size:19px;line-height:1.7;}
    .hdr{background:var(--cd);color:var(--cr);padding:0 2rem;display:flex;align-items:center;justify-content:space-between;height:80px;box-shadow:0 3px 12px var(--shd);position:sticky;top:0;z-index:100;}
    .logo{font-family:var(--fd);font-size:1.5rem;color:var(--cgl);letter-spacing:.02em;font-style:italic;cursor:pointer;}
    .logo span{color:var(--cr);font-style:normal;font-size:.85rem;display:block;font-family:var(--fb);letter-spacing:.15em;text-transform:uppercase;}
    .nav{display:flex;gap:.5rem;align-items:center;}
    .btn{font-family:var(--fb);font-size:1rem;font-weight:600;border:none;border-radius:6px;padding:.6rem 1.4rem;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:.5rem;letter-spacing:.03em;}
    .btn:focus-visible{outline:3px solid var(--cg);outline-offset:3px;}
    .btn:disabled{opacity:.5;cursor:not-allowed;}
    .bp{background:var(--cg);color:var(--cd)}.bp:hover:not(:disabled){background:var(--cgl);transform:translateY(-1px);box-shadow:0 4px 12px var(--sh);}
    .bg{background:transparent;color:var(--cr);border:2px solid rgba(255,255,255,.4)}.bg:hover{background:rgba(255,255,255,.1);border-color:var(--cgl);}
    .bd{background:var(--crd);color:#fff}.bd:hover:not(:disabled){background:#a33;}
    .bs{background:var(--cgr);color:#fff}.bs:hover:not(:disabled){background:#2d5a3d;}
    .bo{background:transparent;color:var(--cm);border:2px solid var(--cl)}.bo:hover{background:var(--csl);}
    .blg{font-size:1.2rem;padding:.85rem 2rem;border-radius:8px;}
    .bsm{font-size:.9rem;padding:.4rem 1rem;}
    main{min-height:calc(100vh - 80px);padding:2rem;max-width:1280px;margin:0 auto;}
    .hero{text-align:center;padding:3rem 1rem 2rem;}
    .hero h1{font-family:var(--fd);font-size:3rem;color:var(--cd);margin-bottom:.5rem;}
    .hero p{font-size:1.2rem;color:var(--cm);max-width:600px;margin:0 auto;}
    .divider{width:80px;height:3px;background:var(--cg);margin:1.2rem auto;border-radius:2px;}
    .fbar{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin:1.5rem 0 2rem;}
    .fbtn{font-family:var(--fb);font-size:1rem;padding:.5rem 1.4rem;border-radius:30px;border:2px solid var(--cl);background:transparent;color:var(--cm);cursor:pointer;transition:all .2s;font-weight:500;}
    .fbtn:hover{background:var(--csl);}.fbtn.act{background:var(--cd);color:var(--cr);border-color:var(--cd);}
    .fbtn:focus-visible{outline:3px solid var(--cg);outline-offset:3px;}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem;}
    .card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px var(--sh);cursor:pointer;transition:all .25s;border:1px solid var(--csl);}
    .card:hover{transform:translateY(-4px);box-shadow:0 8px 28px var(--shd);}
    .card:focus-visible{outline:4px solid var(--cg);outline-offset:2px;}
    .card img{width:100%;height:220px;object-fit:cover;display:block;}
    .cinfo{padding:1rem 1.2rem;}
    .ctitle{font-family:var(--fd);font-size:1.1rem;color:var(--cd);font-weight:600;}
    .cmeta{font-size:.9rem;color:var(--cl);margin-top:.25rem;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}
    .badge{display:inline-block;background:var(--csl);color:var(--cm);padding:.15rem .6rem;border-radius:12px;font-size:.8rem;font-weight:600;}
    .bgnote{background:#e8f4e8;color:var(--cgr);}.bgaudio{background:#e8e8f4;color:#3d3d8b;}
    .detail{max-width:960px;margin:0 auto;}
    .dimg{width:100%;border-radius:12px;box-shadow:0 4px 24px var(--shd);display:block;max-height:500px;object-fit:cover;}
    .dhead{margin:1.5rem 0 1rem;}.dhead h2{font-family:var(--fd);font-size:2rem;}
    .nsec{background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 10px var(--sh);border:1px solid var(--csl);margin-top:1.5rem;}
    .nsec h3{font-family:var(--fd);font-size:1.4rem;color:var(--cd);margin-bottom:1rem;display:flex;align-items:center;gap:.5rem;}
    .nitem{background:var(--cr);border-radius:8px;padding:1rem 1.2rem;margin-bottom:.75rem;border-left:4px solid var(--cg);position:relative;}
    .nitem p{font-size:1rem;color:var(--cd);line-height:1.6;padding-right:2rem;}
    .ndate{font-size:.82rem;color:var(--cl);margin-top:.4rem;}
    .ndel{position:absolute;top:.75rem;right:.75rem;background:none;border:none;cursor:pointer;color:var(--cl);padding:4px;border-radius:4px;transition:color .2s;}
    .ndel:hover{color:var(--crd);}
    .aitem{background:#f0f0fa;border-radius:8px;padding:.9rem 1.2rem;margin-bottom:.75rem;border-left:4px solid #7070c8;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;}
    .aitem audio{flex:1;min-width:200px;height:40px;}
    .albl{font-size:.95rem;color:#3d3d8b;font-weight:600;white-space:nowrap;}
    .nedit{margin-top:1.2rem;border-top:2px solid var(--csl);padding-top:1.2rem;}
    .nedit h4{font-family:var(--fd);font-size:1.15rem;margin-bottom:.75rem;color:var(--cm);}
    .nta{width:100%;border:2px solid var(--cs);border-radius:8px;padding:.85rem;font-family:var(--fb);font-size:1.05rem;color:var(--cd);background:var(--cw);resize:vertical;min-height:100px;line-height:1.6;transition:border-color .2s;}
    .nta:focus{outline:none;border-color:var(--cg);}
    .neacts{display:flex;gap:.75rem;margin-top:.75rem;flex-wrap:wrap;}
    .arec{margin-top:1rem;padding:1.2rem;background:#f0f0fa;border-radius:10px;border:2px solid #c8c8f0;}
    .arec h4{font-family:var(--fd);font-size:1.1rem;color:#3d3d8b;margin-bottom:.75rem;}
    .recst{display:flex;align-items:center;gap:.6rem;font-size:1rem;color:#3d3d8b;margin-bottom:.75rem;font-weight:500;}
    .recdot{width:14px;height:14px;background:var(--crd);border-radius:50%;animation:pulse 1s ease-in-out infinite;flex-shrink:0;}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    .aprev{width:100%;margin-top:.75rem;}
    .overlay{position:fixed;inset:0;background:rgba(44,26,14,.65);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);}
    .modal{background:var(--cw);border-radius:16px;padding:2.5rem;max-width:520px;width:100%;box-shadow:0 20px 60px var(--shd);max-height:90vh;overflow-y:auto;}
    .modal h2{font-family:var(--fd);font-size:2rem;color:var(--cd);margin-bottom:.5rem;}
    .modal p.sub{color:var(--cm);font-size:1.05rem;margin-bottom:1.5rem;}
    .flabel{display:block;font-weight:600;font-size:1.05rem;margin-bottom:.4rem;color:var(--cd);}
    .finput{width:100%;border:2px solid var(--cs);border-radius:8px;padding:.75rem 1rem;font-size:1.1rem;font-family:var(--fb);color:var(--cd);background:#fff;transition:border-color .2s;margin-bottom:1rem;}
    .finput:focus{outline:none;border-color:var(--cg);}
    select.finput{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235C3D1E' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .75rem center;padding-right:2.5rem;}
    .ferr{color:var(--crd);font-size:.95rem;margin-top:-.5rem;margin-bottom:.75rem;font-weight:600;}
    .macts{display:flex;gap:.75rem;margin-top:1.5rem;flex-wrap:wrap;}
    .banner{background:linear-gradient(135deg,var(--cgr),#2d5a3d);color:#fff;border-radius:12px;padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:.75rem;font-size:1.05rem;}
    .empty{text-align:center;padding:1.5rem;color:var(--cl);font-size:1rem;font-style:italic;}
    .tpage{max-width:820px;margin:0 auto;}
    .tstep{display:flex;gap:1.5rem;align-items:flex-start;background:#fff;border-radius:12px;padding:1.5rem;margin-bottom:1.2rem;box-shadow:0 2px 10px var(--sh);border:1px solid var(--csl);}
    .snum{width:56px;height:56px;background:var(--cd);color:var(--cgl);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:1.5rem;font-weight:700;flex-shrink:0;}
    .scnt h3{font-family:var(--fd);font-size:1.3rem;color:var(--cd);margin-bottom:.4rem;}
    .scnt p{color:var(--cm);font-size:1rem;line-height:1.65;}
    .tip{background:#fff8e8;border:2px solid var(--cg);border-radius:10px;padding:1.2rem 1.5rem;margin:1.5rem 0;display:flex;gap:1rem;align-items:flex-start;}
    .tip .ti{font-size:1.8rem;}.tip .tt{font-size:1rem;color:var(--cm);line-height:1.6;}
    .tip .tt strong{color:var(--cd);}
    .code-block{background:var(--cd);color:#e8d5b0;border-radius:8px;padding:1.2rem;font-family:monospace;font-size:.82rem;line-height:1.5;overflow-x:auto;white-space:pre;margin:.75rem 0;}
    .upload-zone{border:3px dashed var(--cs);border-radius:12px;padding:3rem 2rem;text-align:center;cursor:pointer;transition:all .2s;background:var(--cr);}
    .upload-zone:hover,.upload-zone.drag{border-color:var(--cg);background:var(--csl);}
    .upload-zone p{color:var(--cm);font-size:1.1rem;margin-top:.5rem;}
    .prog{height:8px;background:var(--csl);border-radius:4px;overflow:hidden;margin:.75rem 0;}
    .prog-bar{height:100%;background:var(--cg);border-radius:4px;transition:width .3s;}
    footer{text-align:center;padding:2rem;color:var(--cl);font-size:.95rem;border-top:2px solid var(--csl);margin-top:3rem;font-style:italic;}
    .loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5rem 2rem;gap:1rem;color:var(--cm);}
    .spin{width:48px;height:48px;border:4px solid var(--csl);border-top-color:var(--cg);border-radius:50%;animation:spin 1s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:640px){
      .hdr{padding:0 1rem;}.logo{font-size:1.1rem;}
      main{padding:1rem;}.hero h1{font-size:2rem;}
      .grid{grid-template-columns:1fr;}.tstep{flex-direction:column;}
      .macts{flex-direction:column;}.modal{padding:1.5rem;}
    }
  `;
  document.head.appendChild(el);
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Ic = ({ d, s = 20, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const I = {
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  out: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  back: "M19 12H5M12 19l-7-7 7-7",
  help: "M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  mic: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8",
  close: "M18 6L6 18M6 6l12 12",
  plus: "M12 5v14M5 12h14",
  img: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 13a3 3 0 100-6 3 3 0 000 6z",
  gear: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
};

const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // App state
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [view, setView] = useState("gallery");
  const [selId, setSelId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [session, setSession] = useState(null); // { access_token, user }

  // Modals
  const [showLogin, setShowLogin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Note editor
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteErr, setNoteErr] = useState("");

  // Audio recording
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [recSecs, setRecSecs] = useState(0);
  const [audioSaving, setAudioSaving] = useState(false);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Photo upload
  const [upFile, setUpFile] = useState(null);
  const [upTitle, setUpTitle] = useState("");
  const [upCat, setUpCat] = useState("Other");
  const [upDrag, setUpDrag] = useState(false);
  const [upProg, setUpProg] = useState(0);
  const [upErr, setUpErr] = useState("");
  const [upLoading, setUpLoading] = useState(false);
  const fileInputRef = useRef(null);

  const photo = photos.find((p) => p.id === selId);

  const syncStoragePhotos = useCallback(async (existingPhotos) => {
    let files;
    try {
      files = await api.listStorageFiles("photos", "", session?.access_token);
      console.log("[sync] storage files:", files);
    } catch (e) {
      console.log("[sync] listStorageFiles failed:", e);
      return [];
    }
    const existingPaths = new Set(existingPhotos.map((p) => p.storage_path));
    console.log("[sync] existing paths:", [...existingPaths]);
    const missing = files.filter((f) => {
      if (!f.name || f.id === null) return false;
      const ext = f.name.split(".").pop().toLowerCase();
      return IMAGE_EXTS.has(ext) && !existingPaths.has(f.name);
    });
    console.log("[sync] missing files:", missing);
    if (missing.length === 0) return [];
    const token = session?.access_token || null;
    const created = [];
    for (const f of missing) {
      const photo = await api.syncPhoto(titleFromFilename(f.name), "Other", f.name, token);
      console.log("[sync] syncPhoto result for", f.name, ":", photo);
      if (photo) created.push(photo);
    }
    return created;
  }, [session]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setLoadErr("");
    try {
      const data = await api.getPhotos();
      const existing = data.map((p) => ({ ...p, notes: p.notes || [], audio_notes: p.audio_notes || [] }));
      const synced = await syncStoragePhotos(existing);
      setPhotos(synced.length > 0 ? [...synced, ...existing] : existing);
    } catch (e) {
      setLoadErr(e.message);
    }
    setLoading(false);
  }, [syncStoragePhotos]);

  useEffect(() => { injectStyles(); }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadPhotos(); }, [loadPhotos]);


  // Login
  const handleLogin = async () => {
    if (!loginEmail || !loginPass) { setLoginErr("Please enter your email and password."); return; }
    setLoginLoading(true); setLoginErr("");
    try {
      const s = await api.signIn(loginEmail, loginPass);
      setSession(s);
      setShowLogin(false); setLoginEmail(""); setLoginPass("");
    } catch (e) {
      setLoginErr(e.message);
    }
    setLoginLoading(false);
  };

  // Navigation
  const openPhoto = (id) => { setSelId(id); setView("detail"); setNoteText(""); setAudioURL(null); setAudioBlob(null); };
  const goGallery = () => { setView("gallery"); setSelId(null); stopRecording(); };

  // Notes
  const addNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true); setNoteErr("");
    try {
      const note = await api.addNote(selId, noteText.trim(), session.access_token);
      setPhotos((ps) => ps.map((p) => p.id === selId ? { ...p, notes: [note, ...p.notes] } : p));
      setNoteText("");
    } catch (e) { setNoteErr(e.message); }
    setNoteSaving(false);
  };

  const deleteNote = async (noteId) => {
    try {
      await api.deleteNote(noteId, session.access_token);
      setPhotos((ps) => ps.map((p) => p.id === selId ? { ...p, notes: p.notes.filter((n) => n.id !== noteId) } : p));
    } catch (e) { alert(e.message); }
  };

  // Audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecRef.current.start();
      setRecording(true); setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch { alert("Microphone access is needed. Please allow it in your browser."); }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecRef.current && recording) {
      mediaRecRef.current.stop(); setRecording(false); clearInterval(timerRef.current);
    }
  }, [recording]);

  const saveAudio = async () => {
    if (!audioBlob) return;
    setAudioSaving(true);
    try {
      const path = await api.uploadAudio(selId, audioBlob, session.access_token);
      const label = `Voice Memory ${(photo?.audio_notes?.length || 0) + 1}`;
      const audioNote = await api.addAudioNote(selId, path, label, session.access_token);
      audioNote.url = api.publicUrl("audio-notes", path);
      setPhotos((ps) => ps.map((p) => p.id === selId ? { ...p, audio_notes: [audioNote, ...p.audio_notes] } : p));
      setAudioURL(null); setAudioBlob(null);
    } catch (e) { alert(e.message); }
    setAudioSaving(false);
  };

  const deleteAudio = async (audioId, storagePath) => {
    try {
      await api.deleteAudioNote(audioId, storagePath, session.access_token);
      setPhotos((ps) => ps.map((p) => p.id === selId ? { ...p, audio_notes: p.audio_notes.filter((a) => a.id !== audioId) } : p));
    } catch (e) { alert(e.message); }
  };

  // Photo upload
  const handleUpload = async () => {
    if (!upFile || !upTitle.trim()) { setUpErr("Please choose a photo and enter a title."); return; }
    setUpLoading(true); setUpErr(""); setUpProg(10);
    try {
      setUpProg(40);
      const path = await api.uploadPhoto(upFile, session.access_token);
      setUpProg(70);
      const newPhoto = await api.addPhoto(upTitle.trim(), upCat, path, session.access_token);
      newPhoto.storage_path_url = api.publicUrl("photos", path);
      setPhotos((ps) => [newPhoto, ...ps]);
      setUpProg(100);
      setTimeout(() => { setShowUpload(false); setUpFile(null); setUpTitle(""); setUpCat("Other"); setUpProg(0); }, 600);
    } catch (e) { setUpErr(e.message); setUpProg(0); }
    setUpLoading(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault(); setUpDrag(false);
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (f && f.type.startsWith("image/")) { setUpFile(f); if (!upTitle) setUpTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")); }
  };

  const filteredPhotos = filter === "All" ? photos : photos.filter((p) => p.category === filter);

  // ── Main App ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <header className="hdr">
        <div className="logo" onClick={goGallery} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && goGallery()}>
          Memories in Bloom <span>A Family Photo Collection</span>
        </div>
        <nav className="nav">
          {session && (
            <button className="btn bp bsm" onClick={() => setShowUpload(true)}>
              <Ic d={I.plus} s={16} /> Add Photo
            </button>
          )}
          <button className="btn bg" onClick={() => setView("tutorial")} style={{ fontSize: ".95rem", padding: ".5rem 1rem" }}>
            <Ic d={I.help} s={16} /> How to Use
          </button>
{session ? (
            <button className="btn bg" onClick={() => setSession(null)} style={{ fontSize: ".95rem", padding: ".5rem 1rem" }}>
              <Ic d={I.out} s={16} /> Sign Out
            </button>
          ) : (
            <button className="btn bp" onClick={() => setShowLogin(true)} style={{ fontSize: ".95rem", padding: ".5rem 1rem" }}>
              <Ic d={I.lock} s={16} /> Sign In
            </button>
          )}
        </nav>
      </header>

      {/* Login Modal */}
      {showLogin && (
        <div className="overlay" onClick={() => setShowLogin(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Welcome Back! 🌸</h2>
            <p className="sub">Sign in to leave notes and voice memories on the photos.</p>
            <label className="flabel" htmlFor="lemail">Your Email Address</label>
            <input id="lemail" className="finput" type="email" value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="you@example.com" autoFocus />
            <label className="flabel" htmlFor="lpass">Password</label>
            <input id="lpass" className="finput" type="password" value={loginPass} onChange={(e) => { setLoginPass(e.target.value); setLoginErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="Enter your password" />
            {loginErr && <p className="ferr">{loginErr}</p>}
            <div className="macts">
              <button className="btn bp blg" onClick={handleLogin} disabled={loginLoading}>
                <Ic d={I.check} s={20} /> {loginLoading ? "Signing in…" : "Sign In"}
              </button>
              <button className="btn bo blg" onClick={() => { setShowLogin(false); setLoginErr(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

{/* Upload Modal */}
      {showUpload && (
        <div className="overlay" onClick={() => !upLoading && setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add a Photo 📷</h2>
            <p className="sub">Choose a photo from your computer, give it a title, and save it to the album.</p>
            <div className="upload-zone" className={`upload-zone${upDrag ? " drag" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setUpDrag(true); }}
              onDragLeave={() => setUpDrag(false)}
              onDrop={handleFileDrop}>
              <Ic d={I.img} s={40} c="var(--cl)" />
              {upFile
                ? <p style={{ color: "var(--cgr)", fontWeight: 600 }}>✓ {upFile.name}</p>
                : <><p style={{ fontWeight: 600 }}>Click to choose a photo</p><p>or drag and drop it here</p></>}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileDrop} />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <label className="flabel" htmlFor="uptitle">Photo Title</label>
              <input id="uptitle" className="finput" type="text" value={upTitle} onChange={(e) => setUpTitle(e.target.value)}
                placeholder="e.g. Summer Garden, 1978" />
              <label className="flabel" htmlFor="upcat">Category</label>
              <select id="upcat" className="finput" value={upCat} onChange={(e) => setUpCat(e.target.value)}>
                {CATS.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            {upProg > 0 && <div className="prog"><div className="prog-bar" style={{ width: `${upProg}%` }} /></div>}
            {upErr && <p className="ferr">{upErr}</p>}
            <div className="macts">
              <button className="btn bp blg" onClick={handleUpload} disabled={upLoading || !upFile}>
                <Ic d={I.check} s={20} /> {upLoading ? "Uploading…" : "Save Photo"}
              </button>
              <button className="btn bo blg" onClick={() => { setShowUpload(false); setUpFile(null); setUpTitle(""); setUpErr(""); }} disabled={upLoading}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main>

        {/* ── Tutorial ─────────────────────────────────────────────────────── */}
        {view === "tutorial" && (
          <div className="tpage">
            <div className="hero">
              <h1>How to Use This Website</h1>
              <div className="divider" />
              <p>Follow these simple steps to browse photos and leave your memories!</p>
            </div>
            <div className="tip">
              <div className="ti">💡</div>
              <div className="tt"><strong>Tip:</strong> Make text bigger by pressing <strong>Ctrl +</strong> (or <strong>Cmd +</strong> on a Mac)!</div>
            </div>
            {[
              ["1", "Browse the Photos", "On the main gallery page, all the family photos are laid out in a grid. Scroll down to see more. Click any photo to see it up close and read any notes that have been left."],
              ["2", "Filter by Category", "Use the row of buttons (Family, Garden, Holidays…) to show only certain types of photos. Click 'All' to see everything again."],
              ["3", "Sign In to Add Notes", "Click the 'Sign In' button in the top right corner. Enter your email address and password — the same ones your grandchild set up for you."],
              ["4", "Write a Note", "Once signed in and viewing a photo, scroll down to find the note box. Type your memory or description, then press the green 'Save Note' button."],
              ["5", "Record a Voice Memory", "Below the note box you'll find the voice recording area. Press 'Start Recording', speak your story, then press 'Stop'. Listen back, and if you're happy, press 'Save Voice Note'!"],
              ["6", "Go Back to All Photos", "Press the '← Back to Gallery' button at the top of any photo page to return to all the photos."],
            ].map(([n, title, text]) => (
              <div key={n} className="tstep">
                <div className="snum">{n}</div>
                <div className="scnt"><h3>{title}</h3><p>{text}</p></div>
              </div>
            ))}
            <div className="tip">
              <div className="ti">🌸</div>
              <div className="tt"><strong>Need help?</strong> If anything isn't working, don't hesitate to ask — this was made with love, just for you!</div>
            </div>
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <button className="btn bp blg" onClick={goGallery}><Ic d={I.img} s={20} /> Go to the Photos</button>
            </div>
          </div>
        )}

        {/* ── Gallery ──────────────────────────────────────────────────────── */}
        {view === "gallery" && (
          <>
            <div className="hero">
              <h1>Our Family Photos</h1>
              <div className="divider" />
              <p>Cherished moments, lovingly preserved. Click any photo to view it up close.</p>
            </div>

            {session && (
              <div className="banner">
                <Ic d={I.check} s={22} c="white" />
                <div><strong>You're signed in!</strong> Click any photo to add notes and voice memories, or use 'Add Photo' to upload new ones.</div>
              </div>
            )}

            <div className="fbar">
              {CATS.map((cat) => (
                <button key={cat} className={`fbtn${filter === cat ? " act" : ""}`} onClick={() => setFilter(cat)}>{cat}</button>
              ))}
            </div>

            {loading && <div className="loading"><div className="spin" /><p>Loading your photos…</p></div>}
            {loadErr && (
              <div style={{ background: "#fff0f0", border: "2px solid var(--crd)", borderRadius: "10px", padding: "1.5rem", textAlign: "center", color: "var(--crd)" }}>
                <p style={{ fontWeight: 600 }}>Couldn't load photos: {loadErr}</p>
                <button className="btn bp" onClick={loadPhotos} style={{ marginTop: "1rem" }}>Try Again</button>
              </div>
            )}

            {!loading && !loadErr && filteredPhotos.length === 0 && (
              <div className="empty" style={{ padding: "4rem 2rem" }}>
                {photos.length === 0
                  ? <>No photos yet! {session ? <button className="btn bp" onClick={() => setShowUpload(true)} style={{ marginLeft: "1rem" }}>Add the First Photo</button> : "Sign in to add photos."}</>
                  : "No photos in this category yet."}
              </div>
            )}

            <div className="grid">
              {filteredPhotos.map((p) => (
                <div key={p.id} className="card" onClick={() => openPhoto(p.id)}
                  tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openPhoto(p.id)}
                  role="button" aria-label={`View photo: ${p.title}`}>
                  <img src={api.publicUrl("photos", p.storage_path)} alt={p.title} loading="lazy"
                    onError={(e) => { e.target.style.display = "none"; }} />
                  <div className="cinfo">
                    <div className="ctitle">{p.title}</div>
                    <div className="cmeta">
                      <span className="badge">{p.category}</span>
                      {p.notes?.length > 0 && <span className="badge bgnote">✏️ {p.notes.length} note{p.notes.length > 1 ? "s" : ""}</span>}
                      {p.audio_notes?.length > 0 && <span className="badge bgaudio">🎙️ {p.audio_notes.length} audio</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Photo Detail ─────────────────────────────────────────────────── */}
        {view === "detail" && photo && (
          <div className="detail">
            <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".5rem" }}>
              <button className="btn bo" onClick={goGallery}><Ic d={I.back} s={18} /> Back to Gallery</button>
              {session && (
                <button className="btn bd bsm" onClick={async () => {
                  if (!confirm(`Delete "${photo.title}"? This cannot be undone.`)) return;
                  try { await api.deletePhoto(photo.id, photo.storage_path, session.access_token); setPhotos((ps) => ps.filter((p) => p.id !== photo.id)); goGallery(); } catch (e) { alert(e.message); }
                }}><Ic d={I.trash} s={16} /> Delete Photo</button>
              )}
            </div>

            <img src={api.publicUrl("photos", photo.storage_path)} alt={photo.title} className="dimg" />

            <div className="dhead">
              <h2>{photo.title}</h2>
              <span className="badge" style={{ fontSize: "1rem", padding: ".3rem 1rem", marginTop: ".4rem", display: "inline-block" }}>{photo.category}</span>
            </div>

            {/* Notes section */}
            <div className="nsec">
              <h3>📝 Notes &amp; Memories</h3>

              {(!photo.notes?.length && !photo.audio_notes?.length) && (
                <p className="empty">{session ? "No notes yet — add one below!" : "No notes yet. Sign in to add memories."}</p>
              )}

              {photo.notes?.map((note) => (
                <div key={note.id} className="nitem">
                  <p>{note.text}</p>
                  <div className="ndate">📅 {fmtDate(note.created_at)}</div>
                  {session && <button className="ndel" onClick={() => deleteNote(note.id)} aria-label="Delete note"><Ic d={I.trash} s={18} /></button>}
                </div>
              ))}

              {photo.audio_notes?.map((a) => (
                <div key={a.id} className="aitem">
                  <span className="albl">🎙️ {a.label}</span>
                  <audio controls src={a.url || api.publicUrl("audio-notes", a.storage_path)} className="aprev" />
                  {session && (
                    <button className="btn bd bsm" onClick={() => deleteAudio(a.id, a.storage_path)} aria-label="Delete audio">
                      <Ic d={I.trash} s={16} />
                    </button>
                  )}
                </div>
              ))}

              {session ? (
                <div className="nedit">
                  <h4>✏️ Add a Written Note</h4>
                  <textarea className="nta" rows={4}
                    placeholder="Type your memory here… (e.g. 'This was taken at Aunt Betty's farm in summer 1982!')"
                    value={noteText} onChange={(e) => { setNoteText(e.target.value); setNoteErr(""); }} />
                  {noteErr && <p className="ferr">{noteErr}</p>}
                  <div className="neacts">
                    <button className="btn bs blg" onClick={addNote} disabled={!noteText.trim() || noteSaving}>
                      <Ic d={I.check} s={20} /> {noteSaving ? "Saving…" : "Save Note"}
                    </button>
                    {noteText && <button className="btn bo" onClick={() => setNoteText("")}>Clear</button>}
                  </div>

                  {/* Audio Recorder */}
                  <div className="arec" style={{ marginTop: "1.5rem" }}>
                    <h4>🎙️ Add a Voice Memory</h4>
                    <p style={{ fontSize: ".95rem", color: "#3d3d8b", marginBottom: ".75rem" }}>
                      Record yourself telling the story behind this photo. Your voice makes these memories extra special!
                    </p>
                    {recording && (
                      <div className="recst"><div className="recdot" /> Recording… {fmt(recSecs)}</div>
                    )}
                    <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: ".75rem" }}>
                      {!recording ? (
                        <button className="btn blg" style={{ background: "#3d3d8b", color: "#fff" }} onClick={startRecording} disabled={!!audioURL}>
                          <Ic d={I.mic} s={20} /> Start Recording
                        </button>
                      ) : (
                        <button className="btn bd blg" onClick={stopRecording}>⏹ Stop Recording</button>
                      )}
                    </div>
                    {audioURL && (
                      <>
                        <p style={{ fontWeight: 600, color: "#3d3d8b", marginBottom: ".4rem" }}>Listen back before saving:</p>
                        <audio controls src={audioURL} style={{ width: "100%", marginBottom: ".75rem" }} />
                        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                          <button className="btn bs blg" onClick={saveAudio} disabled={audioSaving}>
                            <Ic d={I.check} s={20} /> {audioSaving ? "Saving…" : "Save Voice Note"}
                          </button>
                          <button className="btn bo" onClick={() => { setAudioURL(null); setAudioBlob(null); }} disabled={audioSaving}>Re-record</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "1.5rem 0 .5rem", borderTop: "2px solid var(--csl)", marginTop: "1rem" }}>
                  <p style={{ color: "var(--cm)", marginBottom: "1rem", fontSize: "1.05rem" }}>Sign in to add notes and voice memories.</p>
                  <button className="btn bp blg" onClick={() => setShowLogin(true)}>
                    <Ic d={I.lock} s={20} /> Sign In to Add Notes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer>Made with 💛 to preserve our family's most precious moments.</footer>
    </div>
  );
}
