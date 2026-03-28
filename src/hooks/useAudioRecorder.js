import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "../api/supabase";

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [recSecs, setRecSecs] = useState(0);
  const [audioSaving, setAudioSaving] = useState(false);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = useCallback(async () => {
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
      setRecording(true);
      setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch {
      alert("Microphone access is needed. Please allow it in your browser.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL(null);
    setAudioBlob(null);
  }, [audioURL]);

  const saveAudio = useCallback(async (photoId, token) => {
    if (!audioBlob) return null;
    setAudioSaving(true);
    try {
      const path = await api.uploadAudio(photoId, audioBlob, token);
      const audioNote = await api.addAudioNote(photoId, path, null, token);
      audioNote.url = api.publicUrl("audio-notes", path);
      clearRecording();
      return audioNote;
    } finally {
      setAudioSaving(false);
    }
  }, [audioBlob, clearRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
        mediaRecRef.current.stop();
      }
      clearInterval(timerRef.current);
      // audioURL cleanup handled by clearRecording or will be GC'd
    };
  }, []);

  return {
    recording, audioBlob, audioURL, recSecs, audioSaving,
    startRecording, stopRecording, clearRecording, saveAudio,
  };
}
