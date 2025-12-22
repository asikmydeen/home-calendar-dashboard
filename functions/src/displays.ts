import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const getDisplayData = onCall({ cors: true }, async (request) => {
    const { displayId } = request.data;

    if (!displayId) {
        throw new HttpsError('invalid-argument', 'Display ID is required');
    }

    try {
        const db = admin.firestore();

        // 1. Fetch display record
        const displayDoc = await db.collection('displays').doc(displayId).get();

        if (!displayDoc.exists) {
            throw new HttpsError('not-found', 'Display not found');
        }

        const displayData = displayDoc.data();
        if (displayData?.status !== 'active') {
            throw new HttpsError('permission-denied', 'Display is not active');
        }

        const start = Date.now();
        // 2. Check Owner License
        const ownerId = displayData.ownerId;

        // Check user's license
        const userDoc = await db.collection('users').doc(ownerId).get();
        const userData = userDoc.data();
        const now = Date.now();

        // Check if license exists and is valid
        const license = userData?.license;
        const isLicenseValid = license && license.validUntil && license.validUntil.toMillis() > now;

        // Allow if license is valid OR if we want to be lenient for now (User said "auto assign 1 year", 
        // but if they haven't visited console yet, they might not have it. 
        // Strict approach: Require license. Console page assigns it.)

        if (!isLicenseValid) {
            // Option: Auto-provision here? No, let's strictly require it to "control" access as requested.
            // But we must handle the case where it's missing gracefully? 
            // For now, let's throw if expired.
            if (license) {
                throw new HttpsError('permission-denied', 'License expired');
            }
            // If missing, we might assume free tier fallback? 
            // Let's assume STRICT for the "control" aspect, but 
            // since we haven't migrated existing users, this might break them. 
            // User said: "lets give 1 year free license for every user who logs in"
            // If I strictly block, they must log in to console first. That seems Acceptable.
            // Or I can return a specific error code for frontend to show "License needed".
            throw new HttpsError('permission-denied', 'No active license found. Owner must log in to Console.');
        }

        // 3. Fetch owner's dashboard
        const dashboardDoc = await db.collection('dashboards').doc(ownerId).get();

        if (!dashboardDoc.exists) {
            // Return default/empty dashboard if none exists
            return {
                ownerId,
                pages: [],
                theme: null,
                notFound: true
            };
        }

        // Log perf
        console.log(`Fetched display data for ${displayId} in ${Date.now() - start}ms`);

        return dashboardDoc.data();

    } catch (error) {
        console.error("Error fetching display data:", error);
        throw new HttpsError('internal', 'Failed to fetch display data');
    }
});
