import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

// Export all modules
export * from "./oauth";
export * from "./calendar";

// Health check function
export const helloWorld = onCall((request) => {
  logger.info("Hello logs!", { structuredData: true });
  return { message: "Hello from Firebase!" };
});