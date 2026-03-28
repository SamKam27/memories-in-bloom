import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { PhotosProvider } from "./hooks/usePhotos";
import Header from "./components/Header/Header";
import LoginModal from "./components/LoginModal/LoginModal";
import UploadModal from "./components/UploadModal/UploadModal";
import GalleryPage from "./pages/GalleryPage/GalleryPage";
import PhotoDetailPage from "./pages/PhotoDetailPage/PhotoDetailPage";
import TutorialPage from "./pages/TutorialPage/TutorialPage";
import { Ic, I } from "./components/Icon";
import "./styles/global.css";
import "./styles/buttons.css";
import "./styles/modal.css";

function RequireAuth({ children }) {
  const { session, openLoginModal } = useAuth();
  if (session) return children;
  return (
    <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
      <div className="hero">
        <h1>Our Family Photos</h1>
        <div className="divider" />
        <p>Cherished moments, lovingly preserved.</p>
      </div>
      <p style={{ color: "var(--cm)", fontSize: "1.1rem", marginBottom: "1.5rem" }}>
        Sign in to view the family photo collection.
      </p>
      <button className="btn bp blg" onClick={openLoginModal}>
        <Ic d={I.lock} s={20} /> Sign In
      </button>
    </div>
  );
}

function AppShell() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <PhotosProvider>
      <Header onAddPhoto={() => setShowUpload(true)} />
      <LoginModal />
      <UploadModal show={showUpload} onClose={() => setShowUpload(false)} />
      <main>
        <RequireAuth>
          <Routes>
            <Route path="/" element={<GalleryPage onOpenUpload={() => setShowUpload(true)} />} />
            <Route path="/photo/:id" element={<PhotoDetailPage />} />
            <Route path="/tutorial" element={<TutorialPage />} />
          </Routes>
        </RequireAuth>
      </main>
      <footer>Made with 💛 to preserve our family&apos;s most precious moments.</footer>
    </PhotosProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
