// src/pages/MapGeneral.jsx
import React, { useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/mappage.css";

// helper: wait until window.google.maps is available
function waitForGoogleMaps(timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve(window.google.maps);
    let done = false;
    const start = Date.now();

    const check = () => {
      if (window.google && window.google.maps) {
        done = true;
        return resolve(window.google.maps);
      }
      if (Date.now() - start > timeout) {
        done = true;
        return reject(new Error("Google Maps did not load within timeout"));
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

export default function MapGeneral() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const circlesRef = useRef(new Map());
  const pulsePhaseRef = useRef(0);
  const timerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubSnapshot = null;

    async function init() {
      let maps;
      try {
        maps = await waitForGoogleMaps();
      } catch (e) {
        console.error("Google Maps failed to load:", e);
        setLoading(false);
        return;
      }

      if (!mounted) return;

      // Defensive: ensure SymbolPath exists before using it
      if (!maps.SymbolPath) {
        console.error("Google Maps loaded but SymbolPath is missing", maps);
        setLoading(false);
        return;
      }

      const map = new maps.Map(containerRef.current, {
        center: { lat: 12.9716, lng: 77.5946 },
        zoom: 15,
        mapTypeControl: false,
      });
      mapRef.current = map;

      // try to get current position and place a blue dot marker
      try {
        const pos = await getCurrentPosition();
        map.setCenter({ lat: pos.latitude, lng: pos.longitude });
        map.setZoom(16);
        new maps.Marker({
          map,
          position: { lat: pos.latitude, lng: pos.longitude },
          title: "You are here",
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
      } catch (e) {
        // geolocation blocked or unavailable — ignore
      }

      unsubSnapshot = onSnapshot(collection(db, "alerts"), (snap) => {
        snap.docs.forEach((d) => {
          const id = d.id;
          const data = d.data();
          if (!data.location) return;
          const lat = Number(data.location.lat);
          const lng = Number(data.location.lng);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return;
          const pos = { lat, lng };

          // Marker
          if (!markersRef.current.has(id)) {
            const isRisk = (data.risk_level || "").toUpperCase() === "RISK";
            const marker = new maps.Marker({
              map,
              position: pos,
              title: data.risk_level || "Alert",
              icon: {
                path: maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: isRisk ? "#b00020" : "#2E7D32",
                fillOpacity: 0.95,
                strokeColor: "#fff",
                strokeWeight: 1,
              },
            });
            markersRef.current.set(id, marker);
          } else {
            markersRef.current.get(id).setPosition(pos);
          }

          // Circle
          if (!circlesRef.current.has(id)) {
            const isRisk = (data.risk_level || "").toUpperCase() === "RISK";
            const base = isRisk ? 200 : 100;
            const amp = isRisk ? 80 : 0;
            const circle = new maps.Circle({
              map,
              center: pos,
              radius: base,
              strokeColor: isRisk ? "#b00020" : "#2E7D32",
              strokeOpacity: 0.6,
              fillColor: isRisk ? "#b00020" : "#2E7D32",
              fillOpacity: 0.18,
            });
            circle.__meta = { base, amp, isRisk };
            circlesRef.current.set(id, circle);
          } else {
            const c = circlesRef.current.get(id);
            c.setCenter(pos);
            const isRisk = (data.risk_level || "").toUpperCase() === "RISK";
            c.__meta.isRisk = isRisk;
          }
        });

        // remove deleted docs' overlays
        const ids = new Set(snap.docs.map(d => d.id));
        for (const key of Array.from(markersRef.current.keys())) {
          if (!ids.has(key)) {
            const m = markersRef.current.get(key);
            m.setMap(null);
            markersRef.current.delete(key);
          }
        }
        for (const key of Array.from(circlesRef.current.keys())) {
          if (!ids.has(key)) {
            const c = circlesRef.current.get(key);
            c.setMap(null);
            circlesRef.current.delete(key);
          }
        }
      }, (err) => {
        console.error("alerts snapshot error", err);
      });

      // pulse animation for risk circles
      timerRef.current = setInterval(() => {
        pulsePhaseRef.current += 0.08;
        const pulse = Math.abs(Math.sin(pulsePhaseRef.current));
        circlesRef.current.forEach((c) => {
          const meta = c.__meta || {};
          if (meta.isRisk) {
            c.setRadius(meta.base + meta.amp * pulse);
            c.setOptions({ fillOpacity: 0.18 + 0.12 * pulse });
          }
        });
      }, 60);

      setLoading(false);
    }

    init();

    return () => {
      mounted = false;
      if (unsubSnapshot) unsubSnapshot();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      {loading && <div style={{ position: "absolute", zIndex: 20, left: 16, top: 16, background: "#fff", padding: 10 }}>Loading map...</div>}
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}

// helper: promisified browser geolocation
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition((pos) => resolve(pos.coords), (err) => reject(err), { enableHighAccuracy: true });
  });
}
