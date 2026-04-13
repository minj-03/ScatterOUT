// src/pages/MapRisk.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/mappage.css";

// helper: wait until window.google.maps is available
function waitForGoogleMaps(timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve(window.google.maps);
    const start = Date.now();

    const check = () => {
      if (window.google && window.google.maps) return resolve(window.google.maps);
      if (Date.now() - start > timeout) return reject(new Error("Google Maps did not load within timeout"));
      requestAnimationFrame(check);
    };
    check();
  });
}

// helper: promisified browser geolocation
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition((pos) => resolve(pos.coords), (err) => reject(err), { enableHighAccuracy: true });
  });
}

export default function MapRisk() {
  const { alertId } = useParams();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef(null);

  useEffect(() => {
    let mounted = true;

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

      // Defensive: ensure core pieces exist
      if (!maps.Map) {
        console.error("Google Maps loaded but Map constructor missing", maps);
        setLoading(false);
        return;
      }

      const map = new maps.Map(containerRef.current, {
        center: { lat: 12.9716, lng: 77.5946 },
        zoom: 15,
      });
      mapRef.current = map;

      // try to center on user's location (optional)
      try {
        const pos = await getCurrentPosition();
        map.setCenter({ lat: pos.latitude, lng: pos.longitude });
        map.setZoom(16);
      } catch (e) {
        // ignore geolocation errors
      }

      // Listen to the single alert doc
      unsubRef.current = onSnapshot(doc(db, "alerts", alertId), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const loc = data.location || {};
        const lat = Number(loc.lat);
        const lng = Number(loc.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return;
        const pos = { lat, lng };
        const isRisk = (data.risk_level || "").toUpperCase() === "RISK";

        // center + zoom
        map.setCenter(pos);
        map.setZoom(16);

        // Marker
        if (!markerRef.current) {
          // if SymbolPath exists, use circle icon; otherwise just default marker
          const icon = (maps.SymbolPath && maps.SymbolPath.CIRCLE) ? {
            path: maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#b00020",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          } : undefined;

          markerRef.current = new maps.Marker({
            map,
            position: pos,
            title: data.risk_level || "Alert",
            ...(icon ? { icon } : {}),
          });
        } else {
          markerRef.current.setPosition(pos);
        }

        // Circle (radial area)
        const radius = isRisk ? 200 : 100;
        const strokeColor = isRisk ? "#b00020" : "#2E7D32";
        const fillColor = isRisk ? "#b00020" : "#2E7D32";

        if (!circleRef.current) {
          circleRef.current = new maps.Circle({
            map,
            center: pos,
            radius,
            strokeColor,
            strokeOpacity: 0.6,
            fillColor,
            fillOpacity: 0.18,
          });
          circleRef.current.__meta = { base: radius, amp: isRisk ? 80 : 0, isRisk };
        } else {
          circleRef.current.setCenter(pos);
          circleRef.current.setRadius(radius);
          circleRef.current.setOptions({ strokeColor, fillColor });
          circleRef.current.__meta.isRisk = isRisk;
        }

        setLoading(false);
      }, (err) => {
        console.error("alert doc snapshot error", err);
      });
    }

    init();

    return () => {
      mounted = false;
      if (unsubRef.current) unsubRef.current();
      // remove overlays if any
      if (markerRef.current) {
        try { markerRef.current.setMap(null); } catch (e) {}
        markerRef.current = null;
      }
      if (circleRef.current) {
        try { circleRef.current.setMap(null); } catch (e) {}
        circleRef.current = null;
      }
    };
  }, [alertId]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      {loading && <div style={{ position: "absolute", zIndex: 10, left: 16, top: 16, background: "#fff", padding: 10 }}>Loading...</div>}
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
