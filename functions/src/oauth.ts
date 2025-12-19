import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { google } from "googleapis";

// These should be set in Firebase Config: firebase functions:config:set google.client_id="..." google.client_secret="..."
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "MOCK_CLIENT_ID";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "MOCK_CLIENT_SECRET";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/integrations/google/callback";

function createOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export const getGoogleAuthUrl = onCall((request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const oauth2Client = createOAuth2Client();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/photoslibrary.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "openid"
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
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    let email = null;
    let displayName = null;

    // Try to get email from ID token first (more robust)
    if (tokens.id_token) {
      try {
        const ticket = await oauth2Client.verifyIdToken({
          idToken: tokens.id_token,
          audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload?.email) {
          email = payload.email;
          displayName = payload.name || payload.email;
          console.log("Verified ID token for:", email);
        }
      } catch (idTokenError) {
        console.warn("Failed to verify ID token, falling back to userinfo:", idTokenError);
      }
    }

    // Fallback: Fetch user info if ID token didn't work
    if (!email) {
      const oauth2 = google.oauth2('v2');
      const userInfo = await oauth2.userinfo.get({ auth: oauth2Client });
      email = userInfo.data.email;
      displayName = userInfo.data.name || email;
    }

    if (!email) {
      throw new HttpsError("internal", "Could not retrieve email from Google account.");
    }

    // Sanitize email for document ID
    const accountId = email.replace(/[^a-zA-Z0-9]/g, '_');

    console.log("Tokens received for:", email);

    // Store tokens securely in Firestore subcollection
    await admin.firestore()
      .collection("integrations")
      .doc(request.auth.uid)
      .collection("accounts")
      .doc(accountId)
      .set({
        provider: 'google',
        accountId: accountId,
        email: email,
        displayName: displayName,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

    return { success: true, email, accountId };
  } catch (error: any) {
    console.error("Error exchanging code:", error);
    // Provide more detailed error info
    throw new HttpsError("internal", `Failed to exchange code: ${error.message || 'Unknown error'}`);
  }
});
