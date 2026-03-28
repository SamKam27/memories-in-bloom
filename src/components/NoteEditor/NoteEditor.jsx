import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePhotos } from "../../hooks/usePhotos";
import { api } from "../../api/supabase";
import { fmtDate } from "../../utils/format";
import { Ic, I } from "../Icon";
import AudioRecorder from "../AudioRecorder/AudioRecorder";
import "./NoteEditor.css";

export default function NoteEditor({ photo }) {
  const { session, openLoginModal } = useAuth();
  const { updatePhoto } = usePhotos();
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteErr, setNoteErr] = useState("");

  const addNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    setNoteErr("");
    try {
      const note = await api.addNote(photo.id, noteText.trim(), session.access_token);
      updatePhoto(photo.id, (p) => ({ ...p, notes: [note, ...p.notes] }));
      setNoteText("");
    } catch (e) {
      setNoteErr(e.message);
    }
    setNoteSaving(false);
  };

  const deleteNote = async (noteId) => {
    try {
      await api.deleteNote(noteId, session.access_token);
      updatePhoto(photo.id, (p) => ({ ...p, notes: p.notes.filter((n) => n.id !== noteId) }));
    } catch (e) {
      alert(e.message);
    }
  };

  const deleteAudio = async (audioId, storagePath) => {
    try {
      await api.deleteAudioNote(audioId, storagePath, session.access_token);
      updatePhoto(photo.id, (p) => ({ ...p, audio_notes: p.audio_notes.filter((a) => a.id !== audioId) }));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="nsec">
      <h3>📝 Notes &amp; Memories</h3>

      {(!photo.notes?.length && !photo.audio_notes?.length) && (
        <p className="empty">{session ? "No notes yet \u2014 add one below!" : "No notes yet. Sign in to add memories."}</p>
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
            placeholder="Type your memory here\u2026 (e.g. 'This was taken at Aunt Betty's farm in summer 1982!')"
            value={noteText} onChange={(e) => { setNoteText(e.target.value); setNoteErr(""); }} />
          {noteErr && <p className="ferr">{noteErr}</p>}
          <div className="neacts">
            <button className="btn bs blg" onClick={addNote} disabled={!noteText.trim() || noteSaving}>
              <Ic d={I.check} s={20} /> {noteSaving ? "Saving\u2026" : "Save Note"}
            </button>
            {noteText && <button className="btn bo" onClick={() => setNoteText("")}>Clear</button>}
          </div>

          <AudioRecorder photo={photo} />
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "1.5rem 0 .5rem", borderTop: "2px solid var(--csl)", marginTop: "1rem" }}>
          <p style={{ color: "var(--cm)", marginBottom: "1rem", fontSize: "1.05rem" }}>Sign in to add notes and voice memories.</p>
          <button className="btn bp blg" onClick={openLoginModal}>
            <Ic d={I.lock} s={20} /> Sign In to Add Notes
          </button>
        </div>
      )}
    </div>
  );
}
