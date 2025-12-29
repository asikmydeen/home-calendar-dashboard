import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { syncCalendarsForUser } from "./calendar";

// Type definition for display data
export interface DisplayData {
    ownerId: string;
    status: 'active' | 'inactive' | 'pending';
    name?: string;
    createdAt?: admin.firestore.Timestamp;
    updatedAt?: admin.firestore.Timestamp;
    [key: string]: any;
}

/**
 * Helper function to validate a displayId and return the owner information.
 * This can be used by both display functions and calendar functions to authorize
 * operations using displayId instead of Firebase Auth.
 *
 * @param displayId - The display ID to validate
 * @returns Object containing ownerId and displayData
 * @throws HttpsError if display is invalid, inactive, or owner has no valid license
 */
export async function getOwnerFromDisplayId(displayId: string): Promise<{
    ownerId: string;
    displayData: DisplayData;
}> {
    if (!displayId) {
        throw new HttpsError('invalid-argument', 'Display ID is required');
    }

    const db = admin.firestore();

    // 1. Get display document
    const displayDoc = await db.collection('displays').doc(displayId).get();

    if (!displayDoc.exists) {
        throw new HttpsError('not-found', 'Display not found');
    }

    const displayData = displayDoc.data() as DisplayData;

    // 2. Validate display exists and status is 'active'
    if (displayData?.status !== 'active') {
        throw new HttpsError('permission-denied', 'Display is not active');
    }

    const ownerId = displayData.ownerId;

    if (!ownerId) {
        throw new HttpsError('internal', 'Display has no owner assigned');
    }

    // 3. Validate owner license
    const userDoc = await db.collection('users').doc(ownerId).get();
    const userData = userDoc.data();
    const now = Date.now();

    const license = userData?.license;
    const isLicenseValid = license && license.validUntil && license.validUntil.toMillis() > now;

    if (!isLicenseValid) {
        if (license) {
            throw new HttpsError('permission-denied', 'License expired');
        }
        throw new HttpsError('permission-denied', 'No active license found. Owner must log in to Console.');
    }

    // 4. Return ownerId and displayData
    return {
        ownerId,
        displayData
    };
}

// Type definitions for calendar data response
interface CalendarAccountInfo {
    id: string;
    email: string;
    provider: string;
    displayName?: string;
    linkedMemberId?: string;
}

interface CalendarData {
    events: any[];
    calendars: any[];
    accounts: CalendarAccountInfo[];
    lastSyncedAt: admin.firestore.Timestamp | null;
}

interface DisplayDataResponse {
    ownerId: string;
    pages?: any[];
    theme?: any;
    notFound?: boolean;
    calendarData: CalendarData | null;
    familyMembers?: any[];
    [key: string]: any; // Allow other dashboard properties
}

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

        let dashboardData: Record<string, any>;
        if (!dashboardDoc.exists) {
            // Use default/empty dashboard if none exists
            dashboardData = {
                ownerId,
                pages: [],
                theme: null,
                notFound: true
            };
        } else {
            dashboardData = dashboardDoc.data() || {};
        }

        // 4. Fetch household/family member data FIRST (needed for account linking)
        let familyMembers: any[] = [];
        try {
            const householdDoc = await db.collection('households').doc(ownerId).get();
            if (householdDoc.exists) {
                const householdData = householdDoc.data();
                familyMembers = householdData?.members || [];
                console.log(`Fetched ${familyMembers.length} family members for display`);
            }
        } catch (householdError) {
            console.error('Error fetching household data:', householdError);
            // Don't fail the request if household data is missing
        }

        // 5. Fetch cached calendar events for the owner
        let calendarData: CalendarData | null = null;
        
        // Stale threshold: 5 minutes (configurable)
        const STALE_THRESHOLD_MS = 5 * 60 * 1000;
        
        try {
            let cachedEventsDoc = await db.collection('cachedEvents').doc(ownerId).get();
            let cachedData = cachedEventsDoc.exists ? cachedEventsDoc.data() : null;
            
            // Check if cache is empty or stale
            const lastSynced = cachedData?.lastSyncedAt?.toMillis() || 0;
            const isStale = Date.now() - lastSynced > STALE_THRESHOLD_MS;
            const isEmpty = !cachedData?.events?.length;
            
            if (isEmpty || isStale) {
                try {
                    console.log(`Display ${displayId}: Cache ${isEmpty ? 'empty' : 'stale'} (last synced: ${lastSynced ? new Date(lastSynced).toISOString() : 'never'}), triggering sync for user ${ownerId}`);
                    await syncCalendarsForUser(ownerId);
                    
                    // Re-fetch cached data after sync
                    cachedEventsDoc = await db.collection('cachedEvents').doc(ownerId).get();
                    cachedData = cachedEventsDoc.exists ? cachedEventsDoc.data() : null;
                    console.log(`Display ${displayId}: Sync completed, ${cachedData?.events?.length || 0} events cached`);
                } catch (syncError) {
                    console.error(`Display ${displayId}: Failed to sync calendars for user ${ownerId}:`, syncError);
                    // Continue with stale/empty data - don't fail the request
                }
            }
            
            if (cachedEventsDoc.exists && cachedData) {
                // Fetch account info for family member display
                const accountsSnapshot = await db
                    .collection('integrations')
                    .doc(ownerId)
                    .collection('accounts')
                    .get();
                
                // Build account-to-member mapping from familyMembers.connectedAccounts
                // This is the SAME logic as AccountsContext uses at runtime
                const accountIdToMember = new Map<string, string>();
                const emailToMember = new Map<string, string>();
                
                familyMembers.forEach((member: any) => {
                    if (member.connectedAccounts && Array.isArray(member.connectedAccounts)) {
                        member.connectedAccounts.forEach((acc: any) => {
                            if (acc.accountId) {
                                accountIdToMember.set(acc.accountId, member.id);
                            }
                            if (acc.email) {
                                emailToMember.set(acc.email.toLowerCase(), member.id);
                            }
                        });
                    }
                });
                
                console.log(`Built account mapping: ${accountIdToMember.size} by ID, ${emailToMember.size} by email`);
                
                const accounts: CalendarAccountInfo[] = accountsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const accountId = doc.id;
                    const email = (data.email || '').toLowerCase();
                    
                    // Derive linkedMemberId using same logic as AccountsContext
                    const linkedMemberId = accountIdToMember.get(accountId) || emailToMember.get(email) || undefined;
                    
                    console.log(`Account ${accountId} (${email}) -> member: ${linkedMemberId || 'none'}`);
                    
                    return {
                        id: accountId,
                        email: data.email || '',
                        provider: data.provider || 'unknown',
                        displayName: data.displayName || data.email || '',
                        linkedMemberId
                    };
                });

                calendarData = {
                    events: cachedData.events || [],
                    calendars: cachedData.calendars || [],
                    accounts: accounts,
                    lastSyncedAt: cachedData.lastSyncedAt || null
                };
            }
        } catch (calendarError) {
            // Log but don't fail - calendar data is optional enhancement
            console.error('Error fetching calendar data:', calendarError);
            // calendarData remains null
        }

        // Log perf
        console.log(`Fetched display data for ${displayId} in ${Date.now() - start}ms`);

        // Combine dashboard data with calendar data
        const response: DisplayDataResponse = {
            ...dashboardData,
            ownerId,
            calendarData,
            familyMembers,
        };

        return response;

    } catch (error) {
        // Re-throw HttpsError instances as-is to preserve error codes
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error fetching display data:", error);
        throw new HttpsError('internal', 'Failed to fetch display data');
    }
});
