import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { OAuth2Client } from "google-auth-library";

// These should be set in Firebase Config: firebase functions:config:set google.client_id="..." google.client_secret="..."
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "MOCK_CLIENT_ID";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "MOCK_CLIENT_SECRET";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/integrations/google/callback";

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

export const getGoogleAuthUrl = onCall((request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/photoslibrary.readonly"
    ],
    state: request.auth.uid,
    prompt: "consent", // Force refresh token
  });

  return { url };
});

export const exchangeGoogleCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { code } = request.data;
  if (!code) {
    throw new HttpsError("invalid-argument", "Missing auth code.");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens securely in Firestore
    // In a real prod app, encrypt the refresh_token before storing
    await admin.firestore().collection("integrations").doc(request.auth.uid).set({
      google: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token, // Crucial for offline access
        expiryDate: tokens.expiry_date,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error("Error exchanging code:", error);
    throw new HttpsError("internal", "Failed to exchange code.");
  }
});
