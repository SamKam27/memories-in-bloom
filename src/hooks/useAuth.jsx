import { createContext, useContext, useState, useCallback } from "react";
import { api } from "../api/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const signIn = useCallback(async (email, password) => {
    const s = await api.signIn(email, password);
    setSession(s);
    setShowLoginModal(false);
    return s;
  }, []);

  const signOut = useCallback(() => setSession(null), []);
  const openLoginModal = useCallback(() => setShowLoginModal(true), []);
  const closeLoginModal = useCallback(() => setShowLoginModal(false), []);

  return (
    <AuthContext.Provider value={{ session, signIn, signOut, showLoginModal, openLoginModal, closeLoginModal }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
