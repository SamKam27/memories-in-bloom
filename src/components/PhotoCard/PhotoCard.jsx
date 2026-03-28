import { Link } from "react-router-dom";
import { api } from "../../api/supabase";
import "./PhotoCard.css";

export default function PhotoCard({ photo }) {
  return (
    <Link to={`/photo/${photo.id}`} className="card" aria-label={`View photo: ${photo.title}`}>
      <img src={api.publicUrl("photos", photo.storage_path)} alt={photo.title} loading="lazy"
        onError={(e) => { e.target.style.display = "none"; }} />
      <div className="cinfo">
        <div className="ctitle">{photo.title}</div>
        <div className="cmeta">
          <span className="badge">{photo.category}</span>
          {photo.notes?.length > 0 && <span className="badge bgnote">✏️ {photo.notes.length} note{photo.notes.length > 1 ? "s" : ""}</span>}
          {photo.audio_notes?.length > 0 && <span className="badge bgaudio">🎙️ {photo.audio_notes.length} audio</span>}
        </div>
      </div>
    </Link>
  );
}
