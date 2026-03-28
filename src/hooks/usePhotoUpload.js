import { useState, useRef, useCallback } from "react";
import { api } from "../api/supabase";

export function usePhotoUpload() {
  const [upFile, setUpFile] = useState(null);
  const [upTitle, setUpTitle] = useState("");
  const [upCat, setUpCat] = useState("Other");
  const [upDrag, setUpDrag] = useState(false);
  const [upProg, setUpProg] = useState(0);
  const [upErr, setUpErr] = useState("");
  const [upLoading, setUpLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setUpDrag(false);
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (f && f.type.startsWith("image/")) {
      setUpFile(f);
      setUpTitle((prev) => prev || f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  }, []);

  const handleUpload = useCallback(async (token) => {
    if (!upFile || !upTitle.trim()) {
      setUpErr("Please choose a photo and enter a title.");
      return null;
    }
    setUpLoading(true);
    setUpErr("");
    setUpProg(10);
    try {
      setUpProg(40);
      const path = await api.uploadPhoto(upFile, token);
      setUpProg(70);
      const newPhoto = await api.addPhoto(upTitle.trim(), upCat, path, token);
      newPhoto.storage_path_url = api.publicUrl("photos", path);
      setUpProg(100);
      return newPhoto;
    } catch (e) {
      setUpErr(e.message);
      setUpProg(0);
      return null;
    } finally {
      setUpLoading(false);
    }
  }, [upFile, upTitle, upCat]);

  const resetUpload = useCallback(() => {
    setUpFile(null);
    setUpTitle("");
    setUpCat("Other");
    setUpProg(0);
    setUpErr("");
  }, []);

  return {
    upFile, upTitle, setUpTitle, upCat, setUpCat, upDrag, setUpDrag,
    upProg, upErr, setUpErr, upLoading, fileInputRef,
    handleFileDrop, handleUpload, resetUpload,
  };
}
