import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

// Export other files
export * from "./oauth";

// Example function
export const helloWorld = onCall((request) => {
  logger.info("Hello logs!", {structuredData: true});
  return { message: "Hello from Firebase!" };
});