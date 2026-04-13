// functions/index.js
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const {
  onDocumentCreated
} = require("firebase-functions/v2/firestore");
const {
  defineString
} = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const admin = require("firebase-admin");
initializeApp();
const db = getFirestore();

// MAIN FUNCTION: runs when a new alert is created in Firestore
exports.notifyOnNewAlert = onDocumentCreated("alerts/{alertId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const alert = snap.data();
  const alertId = event.params.alertId;

  logger.info("New alert created:", alertId, alert);

  // Notification content
  const title = (alert.risk_level || "ALERT").toUpperCase();
  const body = `Risk detected at ${alert.location?.lat}, ${alert.location?.lng}`;

  const payload = {
    notification: { title, body },
    data: {
      alertId: alertId,
      lat: String(alert?.location?.lat || ""),
      lng: String(alert?.location?.lng || "")
    }
  };

  // Read all FCM tokens
  const tokensSnap = await db.collection("fcmTokens").get();
  const tokens = tokensSnap.docs.map((d) => d.id);

  if (!tokens.length) {
    logger.warn("No FCM tokens found.");
    return;
  }

  logger.info(`Sending notifications to ${tokens.length} devices...`);

  const messaging = admin.messaging();

  // Batch send (Firebase handles chunking)
  const res = await messaging.sendEachForMulticast({
    tokens,
    ...payload
  });

  // Clean up invalid tokens
  const invalidTokens = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const error = r.error;
      const token = tokens[i];
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        invalidTokens.push(token);
      }
    }
  });

  for (const t of invalidTokens) {
    await db.collection("fcmTokens").doc(t).delete();
    logger.info("Deleted invalid FCM token:", t);
  }

  logger.info("Notification send complete.");

  return null;
});
