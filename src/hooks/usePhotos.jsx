import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, IMAGE_EXTS, titleFromFilename } from "../api/supabase";
import { useAuth } from "./useAuth";

const PhotosContext = createContext(null);

export function PhotosProvider({ children }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const { session } = useAuth();

  const syncStoragePhotos = useCallback(async (existingPhotos) => {
    let files;
    try {
      files = await api.listStorageFiles("photos", "", session?.access_token);
    } catch {
      return [];
    }
    const existingPaths = new Set(existingPhotos.map((p) => p.storage_path));
    const missing = files.filter((f) => {
      if (!f.name || f.id === null) return false;
      const ext = f.name.split(".").pop().toLowerCase();
      return IMAGE_EXTS.has(ext) && !existingPaths.has(f.name);
    });
    if (missing.length === 0) return [];
    const token = session?.access_token || null;
    const created = [];
    for (const f of missing) {
      const photo = await api.syncPhoto(titleFromFilename(f.name), "Other", f.name, token);
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

  const updatePhoto = useCallback((id, updaterFn) => {
    setPhotos((ps) => ps.map((p) => p.id === id ? updaterFn(p) : p));
  }, []);

  const addPhotoToState = useCallback((photo) => {
    setPhotos((ps) => [photo, ...ps]);
  }, []);

  const removePhoto = useCallback((id) => {
    setPhotos((ps) => ps.filter((p) => p.id !== id));
  }, []);

  // Load photos on mount (and when session changes)
  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  return (
    <PhotosContext.Provider value={{ photos, loading, loadErr, loadPhotos, updatePhoto, addPhotoToState, removePhoto }}>
      {children}
    </PhotosContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePhotos() {
  const ctx = useContext(PhotosContext);
  if (!ctx) throw new Error("usePhotos must be used within PhotosProvider");
  return ctx;
}
