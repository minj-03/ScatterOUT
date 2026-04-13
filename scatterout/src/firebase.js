// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// paste your Firebase web config here (from Firebase console -> project settings -> SDK)
const firebaseConfig = {
  apiKey: "", // <-- paste your Browser API key here
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Initialize
const app = initializeApp(firebaseConfig);

// Exports used by the app
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
