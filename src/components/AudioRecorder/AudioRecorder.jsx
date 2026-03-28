import { useAuth } from "../../hooks/useAuth";
import { usePhotos } from "../../hooks/usePhotos";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { fmt } from "../../utils/format";
import { Ic, I } from "../Icon";
import "./AudioRecorder.css";

export default function AudioRecorder({ photo }) {
  const { session } = useAuth();
  const { updatePhoto } = usePhotos();
  const {
    recording, audioURL, recSecs, audioSaving,
    startRecording, stopRecording, clearRecording, saveAudio,
  } = useAudioRecorder();

  const handleSave = async () => {
    const audioNote = await saveAudio(photo.id, session.access_token);
    if (audioNote) {
      const label = `Voice Memory ${(photo?.audio_notes?.length || 0) + 1}`;
      audioNote.label = label;
      updatePhoto(photo.id, (p) => ({ ...p, audio_notes: [audioNote, ...p.audio_notes] }));
    }
  };

  return (
    <div className="arec" style={{ marginTop: "1.5rem" }}>
      <h4>🎙️ Add a Voice Memory</h4>
      <p style={{ fontSize: ".95rem", color: "#3d3d8b", marginBottom: ".75rem" }}>
        Record yourself telling the story behind this photo. Your voice makes these memories extra special!
      </p>
      {recording && (
        <div className="recst"><div className="recdot" /> Recording\u2026 {fmt(recSecs)}</div>
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
            <button className="btn bs blg" onClick={handleSave} disabled={audioSaving}>
              <Ic d={I.check} s={20} /> {audioSaving ? "Saving\u2026" : "Save Voice Note"}
            </button>
            <button className="btn bo" onClick={clearRecording} disabled={audioSaving}>Re-record</button>
          </div>
        </>
      )}
    </div>
  );
}
