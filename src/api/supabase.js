// ─── Constants ────────────────────────────────────────────────────────────────
export const CATS = ["All", "Family", "Garden", "Holidays", "Places", "Travel", "Other"];
export const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif", "svg", "bmp", "tiff", "tif"]);
export const titleFromFilename = (name) =>
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
      const pageSize = 100;
      let all = [];
      let offset = 0;
      while (true) {
        const r = await fetch(
          `${base}/rest/v1/photos?select=*,notes(*),audio_notes(*)&order=created_at.desc&limit=${pageSize}&offset=${offset}`,
          { headers: hd(null) }
        );
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || `Load failed (${r.status})`); }
        const page = await r.json();
        all = all.concat(page);
        if (page.length < pageSize) break;
        offset += pageSize;
      }
      return all;
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
export const api = mkApi(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
