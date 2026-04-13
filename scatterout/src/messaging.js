// src/messaging.js
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { db } from "./firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

// Use the VAPID public key you already set
const VAPID_KEY = "";

// Register service worker
export async function registerMessagingServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("[messaging] Service worker registered:", reg);
    return reg;
  } catch (err) {
    console.error("[messaging] SW registration failed", err);
    return null;
  }
}

// Request token (wait for active SW)
export async function requestAndSaveToken(userId = "anonymous") {
  console.log("[messaging] requestAndSaveToken start");
  try {
    if (Notification.permission === "denied") {
      console.warn("[messaging] Notification permission denied");
      return null;
    }

    const readyReg = await navigator.serviceWorker.ready;
    console.log("[messaging] SW ready:", readyReg);

    const messaging = getMessaging();
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: readyReg
    });

    console.log("[messaging] getToken result:", token);

    if (!token) {
      console.warn("[messaging] getToken returned null");
      return null;
    }

    await setDoc(doc(db, "fcmTokens", token), {
      userId,
      createdAt: new Date().toISOString()
    });

    console.log("[messaging] Token saved to Firestore:", token);
    return token;
  } catch (err) {
    console.error("[messaging] Error retrieving token:", err);
    return null;
  }
}

export async function removeTokenFromFirestore(token) {
  try {
    await deleteDoc(doc(db, "fcmTokens", token));
    console.log("[messaging] Token removed:", token);
  } catch (err) {
    console.error("[messaging] Failed to remove token:", err);
  }
}

export function listenForForegroundMessages(callback) {
  try {
    const messaging = getMessaging();
    onMessage(messaging, (payload) => {
      console.log("[messaging] Foreground message:", payload);
      callback(payload);
    });
  } catch (err) {
    console.error("[messaging] onMessage error", err);
  }
}
