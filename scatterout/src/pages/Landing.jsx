// src/pages/Landing.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css";
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export default function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const t = setTimeout(() => navigate("/dashboard", { replace: true }), 5000);
      return () => clearTimeout(t);
    }
  }, [navigate]);

  async function handleSignIn() {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Sign in failed", err);
      alert("Sign in failed: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-root">
      <img className="landing-image" src="/assets/landing.jpeg" alt="landing" />
      <div className="landing-overlay">
        <div className="center-box">
          <h1 className="brand">SCATTEROUT</h1>
          <p className="subtitle">Prevent stampedes — stay safe</p>

          {!auth.currentUser ? (
            <button className="sign-btn" onClick={handleSignIn} disabled={loading}>
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>
          ) : (
            <p className="signed-msg">Welcome back — redirecting to dashboard...</p>
          )}
        </div>
      </div>
    </div>
  );
}
