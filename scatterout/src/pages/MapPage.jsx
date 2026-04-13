// src/pages/MapPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { importLibrary } from "@googlemaps/js-api-loader";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function MapPage() {
  const { id } = useParams();
  const location = useLocation();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const circleRef = useRef(null);
  const pulseIntervalRef = useRef(null);
  const controlsRef = useRef([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);

      // get alert from state or firestore
      let alert = location.state?.alert;
      if (!alert && id) {
        try {
          const docSnap = await getDoc(doc(db, "alerts", id));
          if (docSnap.exists()) alert = { id: docSnap.id, ...docSnap.data() };
        } catch (err) {
          console.error("Error fetching alert:", err);
        }
      }

      const center = alert?.location
        ? { lat: Number(alert.location.lat), lng: Number(alert.location.lng) }
        : { lat: 12.9716, lng: 77.5946 };

      try {
        const libs = await importLibrary("maps");
        console.log("[MapPage] importLibrary('maps') returned:", libs);

        if (!mounted) return;

        const { Map, Marker, Circle, InfoWindow, ControlPosition } = libs;

        if (!Map || !Marker) {
          console.error("[MapPage] Map or Marker missing — check console for Google Maps API error (NoApiKeys / ApiProjectMapError / RefererNotAllowedMapError).");
          setLoading(false);
          return;
        }

        // create the map
        mapRef.current = new Map(containerRef.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
        });

        // marker
        const marker = new Marker({
          position: center,
          map: mapRef.current,
          title: alert?.risk_level ? `Risk: ${alert.risk_level}` : "Alert",
        });

        // info window
        const timeStr = alert?.timestamp
          ? (() => {
              try {
                if (alert.timestamp.seconds) return new Date(alert.timestamp.seconds * 1000).toLocaleString();
                return new Date(alert.timestamp).toLocaleString();
              } catch {
                return "";
              }
            })()
          : "";

        const info = new InfoWindow({
          content: `<div style="font-size:14px"><strong>${alert?.risk_level ?? "Alert"}</strong><div>${timeStr}</div></div>`,
        });
        marker.addListener("click", () => info.open(mapRef.current, marker));

        // pulsating circle for RISK alerts
        const isRisk = ((alert?.risk_level || "").toString().toUpperCase() === "RISK");
        if (isRisk) {
          const minR = Number(alert?.minRadius ?? 80);
          const maxR = Number(alert?.radius ?? 200);
          let currentR = minR;
          let growing = true;

          circleRef.current = new Circle({
            strokeColor: "#b00020",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#b0002066",
            fillOpacity: 0.35,
            map: mapRef.current,
            center,
            radius: currentR,
            clickable: false,
          });

          pulseIntervalRef.current = setInterval(() => {
            if (!circleRef.current) return;
            if (growing) {
              currentR += Math.max(6, (maxR - minR) / 20);
              if (currentR >= maxR) growing = false;
            } else {
              currentR -= Math.max(6, (maxR - minR) / 20);
              if (currentR <= minR) growing = true;
            }
            circleRef.current.setRadius(currentR);
            const fillOpacity = 0.12 + ((currentR - minR) / (maxR - minR || 1)) * 0.35;
            circleRef.current.setOptions({ fillOpacity });
          }, 80);
        }

        // current location button
        const locationButton = document.createElement("button");
        locationButton.textContent = "📍 My location";
        Object.assign(locationButton.style, {
          background: "#fff",
          border: "none",
          padding: "8px 10px",
          borderRadius: "6px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          cursor: "pointer",
          fontSize: "14px",
        });

        const onClickLocation = () => {
          if (!navigator.geolocation) {
            alert("Geolocation is not available in your browser.");
            return;
          }
          locationButton.disabled = true;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              mapRef.current.panTo(userPos);
              new Marker({ position: userPos, map: mapRef.current, title: "You are here" });
              locationButton.disabled = false;
            },
            (err) => {
              console.error("Geolocation error:", err);
              alert("Could not get your location: " + (err?.message || "unknown"));
              locationButton.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        };

        locationButton.addEventListener("click", onClickLocation);
        mapRef.current.controls[ControlPosition.BOTTOM_CENTER].push(locationButton);
        controlsRef.current.push({ el: locationButton, handler: onClickLocation, pos: ControlPosition.BOTTOM_CENTER });

        setLoading(false);
      } catch (err) {
        console.error("[MapPage] importLibrary or map init error:", err);
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;

      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }
      if (circleRef.current) {
        try { circleRef.current.setMap(null); } catch {}
        circleRef.current = null;
      }
      try {
        if (mapRef.current && controlsRef.current.length) {
          controlsRef.current.forEach(({ el, handler, pos }) => {
            try { el.removeEventListener("click", handler); } catch {}
            const arr = mapRef.current.controls[pos];
            for (let i = 0; i < arr.getLength(); i++) {
              if (arr.getAt(i) === el) { arr.removeAt(i); break; }
            }
          });
          controlsRef.current = [];
        }
      } catch {}
      mapRef.current = null;
    };
  }, [id, location.state]);

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      {loading && (
        <div style={{ position: "absolute", left: 12, top: 12, background: "#fff", padding: 8, borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.2)", zIndex: 10 }}>
          Loading map...
        </div>
      )}
    </div>
  );
}
