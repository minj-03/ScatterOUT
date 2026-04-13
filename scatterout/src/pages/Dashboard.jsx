// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/dashboard.css"; // optional styling

function formatTs(ts) {
  if (!ts) return "";
  if (ts.toDate) return ts.toDate().toLocaleString();
  return new Date(ts).toLocaleString();
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // order by timestamp desc (latest first). adjust field name if different.
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAlerts(docs);
    }, (err) => {
      console.error("alerts snapshot error", err);
    });

    return () => unsub();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Admin Dashboard</h1>
        <div>
          <button onClick={() => { signOut(auth).then(()=> window.location.href="/"); }} style={{ marginRight: 8 }}>
            Sign out
          </button>
          <button onClick={() => navigate("/map")} >
            Open Live Map
          </button>
        </div>
      </div>

      <h3>Showing recent alerts from Firestore</h3>

      <div style={{ marginTop: 18 }}>
        {alerts.length === 0 && <p>No alerts</p>}

        {alerts.map((a) => {
          const loc = a.location || {};
          const lat = loc.lat?.toFixed?.(6) ?? loc.lat;
          const lng = loc.lng?.toFixed?.(6) ?? loc.lng;
          const risk = (a.risk_level || "NO RISK").toUpperCase();
          return (
            <div key={a.id} className="alert-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    {risk === "RISK" ? "⚠️" : "ℹ️"}
                    <strong style={{ color: risk === "RISK" ? "#B00020" : "#2E7D32" }}>
                      {risk}
                    </strong>
                  </div>
                  <div style={{ fontSize: 18, marginTop: 8 }}>
                    Location: {lat}, {lng}
                  </div>
                  <div style={{ color: "#666", marginTop: 8 }}>
                    Detected at: {formatTs(a.timestamp)}
                  </div>
                </div>

                <div>
                  <button onClick={() => navigate(`/map/${a.id}`)} className="view-map-btn">
                    View on Map
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* sticky bottom button for general map (redundant with top button) */}
      <div style={{
        position: "fixed",
        left: 20,
        right: 20,
        bottom: 20,
        display: "flex",
        justifyContent: "center",
      }}>
        <button onClick={() => navigate("/map")} className="open-map-bottom">
          Open Live Map
        </button>
      </div>
    </div>
  );
}
