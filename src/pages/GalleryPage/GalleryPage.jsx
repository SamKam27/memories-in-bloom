import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePhotos } from "../../hooks/usePhotos";
import { CATS } from "../../api/supabase";
import PhotoCard from "../../components/PhotoCard/PhotoCard";
import "./GalleryPage.css";

export default function GalleryPage({ onOpenUpload }) {
  const { session } = useAuth();
  const { photos, loading, loadErr, loadPhotos } = usePhotos();
  const [filter, setFilter] = useState("All");

  const filteredPhotos = filter === "All" ? photos : photos.filter((p) => p.category === filter);

  return (
    <>
      <div className="hero">
        <h1>Our Family Photos</h1>
        <div className="divider" />
        <p>Cherished moments, lovingly preserved. Click any photo to view it up close.</p>
      </div>

      <div className="fbar">
        {CATS.map((cat) => (
          <button key={cat} className={`fbtn${filter === cat ? " act" : ""}`} onClick={() => setFilter(cat)}>{cat}</button>
        ))}
      </div>

      {loading && <div className="loading"><div className="spin" /><p>Loading your photos…</p></div>}
      {loadErr && (
        <div style={{ background: "#fff0f0", border: "2px solid var(--crd)", borderRadius: "10px", padding: "1.5rem", textAlign: "center", color: "var(--crd)" }}>
          <p style={{ fontWeight: 600 }}>Couldn&apos;t load photos: {loadErr}</p>
          <button className="btn bp" onClick={loadPhotos} style={{ marginTop: "1rem" }}>Try Again</button>
        </div>
      )}

      {!loading && !loadErr && filteredPhotos.length === 0 && (
        <div className="empty" style={{ padding: "4rem 2rem" }}>
          {photos.length === 0
            ? <button className="btn bp" onClick={onOpenUpload}>Add the First Photo</button>
            : "No photos in this category yet."}
        </div>
      )}

      <div className="grid">
        {filteredPhotos.map((p) => (
          <PhotoCard key={p.id} photo={p} />
        ))}
      </div>
    </>
  );
}
