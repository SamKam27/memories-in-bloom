import { useAuth } from "../../hooks/useAuth";
import { usePhotos } from "../../hooks/usePhotos";
import { usePhotoUpload } from "../../hooks/usePhotoUpload";
import { CATS } from "../../api/supabase";
import { Ic, I } from "../Icon";
import "./UploadModal.css";

export default function UploadModal({ show, onClose }) {
  const { session } = useAuth();
  const { addPhotoToState } = usePhotos();
  const {
    upFile, upTitle, setUpTitle, upCat, setUpCat, upDrag, setUpDrag,
    upProg, upErr, upLoading, fileInputRef,
    handleFileDrop, handleUpload, resetUpload,
  } = usePhotoUpload();

  if (!show) return null;

  const onSubmit = async () => {
    const newPhoto = await handleUpload(session.access_token);
    if (newPhoto) {
      addPhotoToState(newPhoto);
      setTimeout(() => { onClose(); resetUpload(); }, 600);
    }
  };

  const onCancel = () => {
    onClose();
    resetUpload();
  };

  return (
    <div className="overlay" onClick={() => !upLoading && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add a Photo 📷</h2>
        <p className="sub">Choose a photo from your computer, give it a title, and save it to the album.</p>
        <div className={`upload-zone${upDrag ? " drag" : ""}`}
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
          <button className="btn bp blg" onClick={onSubmit} disabled={upLoading || !upFile}>
            <Ic d={I.check} s={20} /> {upLoading ? "Uploading\u2026" : "Save Photo"}
          </button>
          <button className="btn bo blg" onClick={onCancel} disabled={upLoading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
