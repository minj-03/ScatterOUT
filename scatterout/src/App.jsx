// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import MapRisk from "./pages/MapRisk";
import MapGeneral from "./pages/MapGeneral";
import { useEffect } from "react";
import { registerMessagingServiceWorker, requestAndSaveToken, listenForForegroundMessages } from "./messaging";
import { auth } from "./firebase";


export default function App() {
  useEffect(() => {
    // small helper to call manually from console too
    window.__requestFcmTokenManually = async () => {
      try {
        await registerMessagingServiceWorker();
        const user = auth.currentUser;
        const uid = user ? user.uid : "anonymous";
        const token = await requestAndSaveToken(uid);
        if (token) localStorage.setItem('fcm_token', token);
        return token;
      } catch (e) {
        console.error('manual token helper failed', e);
        return null;
      }
    };

    (async () => {
      try {
        await registerMessagingServiceWorker();
        const user = auth.currentUser;
        const uid = user ? user.uid : "anonymous";
        await requestAndSaveToken(uid);
        listenForForegroundMessages((payload) => {
          // quick, visible app-visible notification
          alert((payload.notification?.title || '') + "\n" + (payload.notification?.body || ''));
        });
      } catch (e) {
        console.warn('messaging init failed', e);
      }
    })();
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        <Route path="/map" element={<MapGeneral />} />          {/* general live map */}
        <Route path="/map/:alertId" element={<MapRisk />} />   {/* focus on a single alert */}
      </Routes>
    </BrowserRouter>
  );
}


//<Route path="/map/:id" element={<MapPage />} />/