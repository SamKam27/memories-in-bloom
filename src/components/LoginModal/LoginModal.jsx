import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Ic, I } from "../Icon";
import "./LoginModal.css";

export default function LoginModal() {
  const { showLoginModal, closeLoginModal, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (!showLoginModal) return null;

  const handleLogin = async () => {
    if (!email || !pass) { setErr("Please enter your email and password."); return; }
    setLoading(true);
    setErr("");
    try {
      await signIn(email, pass);
      setEmail("");
      setPass("");
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="overlay" onClick={closeLoginModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Welcome Back! 🌸</h2>
        <p className="sub">Sign in to leave notes and voice memories on the photos.</p>
        <label className="flabel" htmlFor="lemail">Your Email Address</label>
        <input id="lemail" className="finput" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="you@example.com" autoFocus />
        <label className="flabel" htmlFor="lpass">Password</label>
        <input id="lpass" className="finput" type="password" value={pass} onChange={(e) => { setPass(e.target.value); setErr(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="Enter your password" />
        {err && <p className="ferr">{err}</p>}
        <div className="macts">
          <button className="btn bp blg" onClick={handleLogin} disabled={loading}>
            <Ic d={I.check} s={20} /> {loading ? "Signing in\u2026" : "Sign In"}
          </button>
          <button className="btn bo blg" onClick={() => { closeLoginModal(); setErr(""); }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
