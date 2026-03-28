import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Ic, I } from "../Icon";
import "./Header.css";

export default function Header({ onAddPhoto }) {
  const { session, signOut, openLoginModal } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="hdr">
      <Link to="/" className="logo">
        Memories in Bloom <span>A Family Photo Collection</span>
      </Link>
      <nav className="nav">
        {session && (
          <button className="btn bp bsm" onClick={onAddPhoto}>
            <Ic d={I.plus} s={16} /> Add Photo
          </button>
        )}
        <button className="btn bg" onClick={() => navigate("/tutorial")} style={{ fontSize: ".95rem", padding: ".5rem 1rem" }}>
          <Ic d={I.help} s={16} /> How to Use
        </button>
        {session ? (
          <button className="btn bg" onClick={signOut} style={{ fontSize: ".95rem", padding: ".5rem 1rem" }}>
            <Ic d={I.out} s={16} /> Sign Out
          </button>
        ) : (
          <button className="btn bp" onClick={openLoginModal} style={{ fontSize: ".95rem", padding: ".5rem 1rem" }}>
            <Ic d={I.lock} s={16} /> Sign In
          </button>
        )}
      </nav>
    </header>
  );
}
