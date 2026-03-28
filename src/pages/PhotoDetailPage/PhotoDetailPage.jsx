import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePhotos } from "../../hooks/usePhotos";
import { api } from "../../api/supabase";
import { Ic, I } from "../../components/Icon";
import NoteEditor from "../../components/NoteEditor/NoteEditor";
import "./PhotoDetailPage.css";

export default function PhotoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { photos, loading, removePhoto } = usePhotos();

  const photo = photos.find((p) => String(p.id) === id);

  if (loading) {
    return <div className="loading"><div className="spin" /><p>Loading…</p></div>;
  }

  if (!photo) {
    return (
      <div className="empty" style={{ padding: "4rem 2rem" }}>
        <p>Photo not found.</p>
        <button className="btn bp" onClick={() => navigate("/")} style={{ marginTop: "1rem" }}>Back to Gallery</button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${photo.title}"? This cannot be undone.`)) return;
    try {
      await api.deletePhoto(photo.id, session.access_token);
      removePhoto(photo.id);
      navigate("/");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="detail">
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".5rem" }}>
        <button className="btn bo" onClick={() => navigate("/")}><Ic d={I.back} s={18} /> Back to Gallery</button>
        {session && (
          <button className="btn bd bsm" onClick={handleDelete}>
            <Ic d={I.trash} s={16} /> Delete Photo
          </button>
        )}
      </div>

      <img src={api.publicUrl("photos", photo.storage_path)} alt={photo.title} className="dimg" />

      <div className="dhead">
        <h2>{photo.title}</h2>
        <span className="badge" style={{ fontSize: "1rem", padding: ".3rem 1rem", marginTop: ".4rem", display: "inline-block" }}>{photo.category}</span>
      </div>

      <NoteEditor photo={photo} />
    </div>
  );
}
