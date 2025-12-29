import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { google, calendar_v3 } from "googleapis";
import { getOwnerFromDisplayId } from "./displays";

// OAuth configuration
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/integrations/google/callback";

// Create OAuth2 client using googleapis - configured per-user in getAuthClient

/**
 * Creates an authenticated OAuth2 client for a user
 */
// Helper to get auth client for a specific account
async function getAuthClient(uid: string, accountId: string) {
    const authClient = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    const accountRef = admin.firestore()
        .collection("integrations")
        .doc(uid)
        .collection("accounts")
        .doc(accountId);
        
    const doc = await accountRef.get();

    const data = doc.data();

    if (!data) {
        throw new HttpsError("not-found", `Account ${accountId} not found.`);
    }

    const { accessToken, refreshToken, expiryDate, email } = data;
    
    // DIAGNOSTIC: Log token state
    console.log(`[getAuthClient] Account: ${accountId} (${email})`);
    console.log(`[getAuthClient] Has refreshToken: ${!!refreshToken}`);
    console.log(`[getAuthClient] Token expiry: ${expiryDate ? new Date(expiryDate).toISOString() : 'none'}`);
    console.log(`[getAuthClient] Current time: ${new Date().toISOString()}`);
    console.log(`[getAuthClient] Token expired: ${expiryDate ? Date.now() > expiryDate - 60000 : 'unknown'}`);

    // Check if refresh token is missing
    if (!refreshToken) {
        console.error(`[getAuthClient] MISSING REFRESH TOKEN for account ${accountId}`);
        // Mark account as needing re-authentication
        await accountRef.update({
            authError: 'missing_refresh_token',
            authErrorMessage: 'No refresh token available. Please reconnect your Google account.',
            authErrorAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        throw new HttpsError("failed-precondition", `Account ${accountId} needs to be reconnected - missing refresh token.`);
    }

    authClient.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: expiryDate,
    });

    // Refresh if needed
    if (expiryDate && Date.now() > expiryDate - 60000) {
        console.log(`[getAuthClient] Token expired or expiring soon, attempting refresh...`);
        
        try {
            const { credentials } = await authClient.refreshAccessToken();
            
            console.log(`[getAuthClient] Token refresh successful!`);
            console.log(`[getAuthClient] New expiry: ${credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'none'}`);
            
            // Store new tokens - IMPORTANT: Also store new refresh_token if provided
            const updateData: any = {
                accessToken: credentials.access_token,
                expiryDate: credentials.expiry_date,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                // Clear any previous auth errors on success
                authError: admin.firestore.FieldValue.delete(),
                authErrorMessage: admin.firestore.FieldValue.delete(),
                authErrorAt: admin.firestore.FieldValue.delete(),
            };
            
            // IMPORTANT: If Google returns a new refresh token, we must store it!
            // This can happen and the old one becomes invalid
            if (credentials.refresh_token) {
                console.log(`[getAuthClient] New refresh token received, updating stored token`);
                updateData.refreshToken = credentials.refresh_token;
            }

            await accountRef.update(updateData);

            authClient.setCredentials(credentials);
        } catch (refreshError: any) {
            console.error(`[getAuthClient] TOKEN REFRESH FAILED for account ${accountId}:`, refreshError);
            console.error(`[getAuthClient] Error code: ${refreshError.code}`);
            console.error(`[getAuthClient] Error message: ${refreshError.message}`);
            
            // Check for invalid_grant specifically
            const isInvalidGrant =
                refreshError.message?.includes('invalid_grant') ||
                refreshError.code === 'invalid_grant' ||
                refreshError.response?.data?.error === 'invalid_grant';
            
            if (isInvalidGrant) {
                console.error(`[getAuthClient] INVALID_GRANT detected - token revoked or expired`);
                
                // Mark account as needing re-authentication in Firestore
                await accountRef.update({
                    authError: 'invalid_grant',
                    authErrorMessage: 'Your Google authorization has expired or been revoked. Please reconnect your account.',
                    authErrorAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                
                throw new HttpsError(
                    "failed-precondition",
                    `Account ${accountId} authorization expired. Please reconnect your Google account.`,
                    { code: 'REAUTH_REQUIRED', accountId, email }
                );
            }
            
            // For other errors, mark as error but don't require re-auth yet
            await accountRef.update({
                authError: 'refresh_failed',
                authErrorMessage: refreshError.message || 'Token refresh failed',
                authErrorAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            throw new HttpsError("internal", `Failed to refresh token for account ${accountId}: ${refreshError.message}`);
        }
    }

    return authClient;
}

export const getCalendarList = onCall(async (request) => { /* Not strictly needed if sync is primary, but skipping for brevity if focus is sync */
    // For now, let's focus on syncCalendars which populates the frontend cache
    return { calendars: [] };
});

export const getCalendarEvents = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { calendarId, timeMin, timeMax, accountId } = request.data;

    if (!accountId) {
        throw new HttpsError("invalid-argument", "Account ID is required.");
    }

    try {
        const oauth2Client = await getAuthClient(request.auth.uid, accountId);
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const response = await calendar.events.list({
            calendarId: calendarId || "primary",
            timeMin: timeMin || new Date().toISOString(),
            timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 250,
        });

        const events = response.data.items || [];

        return {
            events: events.map(evt => ({
                id: evt.id,
                title: evt.summary || "Untitled",
                description: evt.description,
                location: evt.location,
                start: evt.start?.dateTime || evt.start?.date,
                end: evt.end?.dateTime || evt.end?.date,
                isAllDay: !evt.start?.dateTime,
                calendarId: calendarId || "primary",
                accountId: accountId,
                status: evt.status,
                calendarColor: '#4285F4' // We can't easily get color per event without calendar list, default is fine
            }))
        };
    } catch (error: any) {
        console.error("Error fetching events:", error);
        // Return empty list instead of throwing to prevent blocking other accounts? 
        // Or throw to let frontend handle?
        // Let's throw helpful error
        throw new HttpsError("internal", error.message || "Failed to fetch events");
    }
});

/**
 * Create a new calendar event
 */
export const createCalendarEvent = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { calendarId, event, accountId } = request.data;

    if (!event || !event.title) {
        throw new HttpsError("invalid-argument", "Event title is required.");
    }
    if (!accountId) {
        // Fallback or error? For now error to enforce new structure
        throw new HttpsError("invalid-argument", "Account ID is required.");
    }

    try {
        const oauth2Client = await getAuthClient(request.auth.uid, accountId);
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const eventResource: calendar_v3.Schema$Event = {
            summary: event.title,
            description: event.description,
            location: event.location,
            start: event.isAllDay
                ? { date: event.start.split("T")[0] }
                : { dateTime: event.start, timeZone: event.timeZone || "America/Los_Angeles" },
            end: event.isAllDay
                ? { date: event.end.split("T")[0] }
                : { dateTime: event.end, timeZone: event.timeZone || "America/Los_Angeles" },
        };

        // Handle recurrence - use rrule (RFC 5545 format) not recurrence (UI pattern name)
        // event.recurrence contains values like 'none', 'daily', 'weekly' which are NOT valid RRULE strings
        // event.rrule contains the actual RFC 5545 string like 'RRULE:FREQ=DAILY'
        if (event.rrule && typeof event.rrule === 'string' && event.rrule.trim() !== '') {
            eventResource.recurrence = [event.rrule];
        }

        const response = await calendar.events.insert({
            calendarId: calendarId || "primary",
            requestBody: eventResource,
        });

        return {
            success: true,
            event: {
                id: response.data.id,
                htmlLink: response.data.htmlLink,
            },
        };
    } catch (error: any) {
        console.error("Error creating event:", error);
        throw new HttpsError("internal", error.message || "Failed to create event");
    }
});

/**
 * Update an existing calendar event
 */
export const updateCalendarEvent = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { calendarId, eventId, event, accountId } = request.data;

    if (!eventId) {
        throw new HttpsError("invalid-argument", "Event ID is required.");
    }
    if (!accountId) {
        throw new HttpsError("invalid-argument", "Account ID is required.");
    }

    try {
        const oauth2Client = await getAuthClient(request.auth.uid, accountId);
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const eventResource: calendar_v3.Schema$Event = {};

        if (event.title) eventResource.summary = event.title;
        if (event.description !== undefined) eventResource.description = event.description;
        if (event.location !== undefined) eventResource.location = event.location;
        if (event.start) {
            eventResource.start = event.isAllDay
                ? { date: event.start.split("T")[0] }
                : { dateTime: event.start };
        }
        if (event.end) {
            eventResource.end = event.isAllDay
                ? { date: event.end.split("T")[0] }
                : { dateTime: event.end };
        }

        const response = await calendar.events.patch({
            calendarId: calendarId || "primary",
            eventId,
            requestBody: eventResource,
        });

        return {
            success: true,
            event: {
                id: response.data.id,
                htmlLink: response.data.htmlLink,
            },
        };
    } catch (error: any) {
        console.error("Error updating event:", error);
        throw new HttpsError("internal", error.message || "Failed to update event");
    }
});

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { calendarId, eventId, accountId } = request.data;

    if (!eventId) {
        throw new HttpsError("invalid-argument", "Event ID is required.");
    }
    if (!accountId) {
        throw new HttpsError("invalid-argument", "Account ID is required.");
    }

    try {
        const oauth2Client = await getAuthClient(request.auth.uid, accountId);
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        await calendar.events.delete({
            calendarId: calendarId || "primary",
            eventId,
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting event:", error);
        throw new HttpsError("internal", error.message || "Failed to delete event");
    }
});

export const syncCalendars = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    try {
        const accountsSnapshot = await admin.firestore()
            .collection("integrations")
            .doc(request.auth.uid)
            .collection("accounts")
            .where("provider", "==", "google")
            .get();

        const allCalendars: any[] = [];
        const allEvents: any[] = [];

        if (accountsSnapshot.empty) {
            console.log("No accounts found for user", request.auth.uid);
            // Clear cache if no accounts?
            return { success: true, calendarsCount: 0, eventsCount: 0 };
        }

        // Iterate through all connected accounts
        for (const accountDoc of accountsSnapshot.docs) {
            const accountId = accountDoc.id;
            const accountData = accountDoc.data();
            console.log(`Syncing account: ${accountId} (${accountData.email})`);

            try {
                const oauth2Client = await getAuthClient(request.auth.uid, accountId);
                const calendar = google.calendar({ version: "v3", auth: oauth2Client });

                // 1. Get Calendars
                const calendarListResponse = await calendar.calendarList.list();
                const items = calendarListResponse.data.items || [];

                for (const cal of items) {
                    allCalendars.push({
                        id: cal.id, // Keep original ID, but frontend needs to know which account it belongs to
                        accountId: accountId, // VITAL
                        name: cal.summary || 'Unnamed',
                        color: cal.backgroundColor || '#4285F4',
                        primary: cal.primary || false,
                    });

                    // 2. Get Events
                    if (!cal.id) continue;

                    const now = new Date();
                    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

                    try {
                        const eventsResponse = await calendar.events.list({
                            calendarId: cal.id,
                            timeMin,
                            timeMax,
                            maxResults: 200,
                            singleEvents: true,
                            orderBy: "startTime",
                        });

                        const events = eventsResponse.data.items || [];
                        for (const event of events) {
                            allEvents.push({
                                id: event.id || '',
                                calendarId: cal.id || '',
                                accountId: accountId, // VITAL
                                calendarName: cal.summary || 'Unnamed',
                                calendarColor: cal.backgroundColor || '#4285F4',
                                title: event.summary || "Untitled",
                                description: event.description || '',
                                location: event.location || '',
                                start: event.start?.dateTime || event.start?.date || '',
                                end: event.end?.dateTime || event.end?.date || '',
                                isAllDay: !event.start?.dateTime,
                                status: event.status || 'confirmed',
                                attendees: event.attendees || [],
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to sync calendar ${cal.id} for account ${accountId}`, e);
                    }
                }

            } catch (err) {
                console.error(`Failed to sync account ${accountId}`, err);
            }
        }

        // Cache aggregated results
        await admin.firestore().collection("cachedEvents").doc(request.auth.uid).set({
            calendars: allCalendars,
            events: allEvents,
            lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
            success: true,
            calendarsCount: allCalendars.length,
            eventsCount: allEvents.length,
        };

    } catch (error: any) {
        console.error("Error syncing calendars:", error);
        throw new HttpsError("internal", error.message || "Failed to sync calendars");
    }
});

// ============================================================================
// DISPLAY-AUTHORIZED CALENDAR FUNCTIONS
// These functions use displayId for authorization instead of Firebase Auth
// ============================================================================

/**
 * Helper function to sync calendars for a specific user (used internally)
 * This is extracted from syncCalendars to be reusable by display functions
 */
export async function syncCalendarsForUser(uid: string): Promise<{
    calendarsCount: number;
    eventsCount: number;
}> {
    const accountsSnapshot = await admin.firestore()
        .collection("integrations")
        .doc(uid)
        .collection("accounts")
        .where("provider", "==", "google")
        .get();

    const allCalendars: any[] = [];
    const allEvents: any[] = [];

    if (accountsSnapshot.empty) {
        console.log("No accounts found for user", uid);
        return { calendarsCount: 0, eventsCount: 0 };
    }

    // Iterate through all connected accounts
    for (const accountDoc of accountsSnapshot.docs) {
        const accountId = accountDoc.id;
        const accountData = accountDoc.data();
        console.log(`Syncing account: ${accountId} (${accountData.email})`);

        try {
            const oauth2Client = await getAuthClient(uid, accountId);
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            // 1. Get Calendars
            const calendarListResponse = await calendar.calendarList.list();
            const items = calendarListResponse.data.items || [];

            for (const cal of items) {
                allCalendars.push({
                    id: cal.id,
                    accountId: accountId,
                    name: cal.summary || 'Unnamed',
                    color: cal.backgroundColor || '#4285F4',
                    primary: cal.primary || false,
                });

                // 2. Get Events
                if (!cal.id) continue;

                const now = new Date();
                const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

                try {
                    const eventsResponse = await calendar.events.list({
                        calendarId: cal.id,
                        timeMin,
                        timeMax,
                        maxResults: 200,
                        singleEvents: true,
                        orderBy: "startTime",
                    });

                    const events = eventsResponse.data.items || [];
                    for (const event of events) {
                        allEvents.push({
                            id: event.id || '',
                            calendarId: cal.id || '',
                            accountId: accountId,
                            calendarName: cal.summary || 'Unnamed',
                            calendarColor: cal.backgroundColor || '#4285F4',
                            title: event.summary || "Untitled",
                            description: event.description || '',
                            location: event.location || '',
                            start: event.start?.dateTime || event.start?.date || '',
                            end: event.end?.dateTime || event.end?.date || '',
                            isAllDay: !event.start?.dateTime,
                            status: event.status || 'confirmed',
                            attendees: event.attendees || [],
                        });
                    }
                } catch (e) {
                    console.error(`Failed to sync calendar ${cal.id} for account ${accountId}`, e);
                }
            }

        } catch (err) {
            console.error(`Failed to sync account ${accountId}`, err);
        }
    }

    // Cache aggregated results
    await admin.firestore().collection("cachedEvents").doc(uid).set({
        calendars: allCalendars,
        events: allEvents,
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
        calendarsCount: allCalendars.length,
        eventsCount: allEvents.length,
    };
}

/**
 * Create a new calendar event using displayId for authorization
 * Parameters: { displayId, calendarId, event, accountId }
 */
export const createDisplayCalendarEvent = onCall({ cors: true }, async (request) => {
    const { displayId, calendarId, event, accountId } = request.data;

    // Validate required parameters
    if (!displayId) {
        throw new HttpsError("invalid-argument", "Display ID is required.");
    }
    if (!event || !event.title) {
        throw new HttpsError("invalid-argument", "Event title is required.");
    }
    if (!accountId) {
        throw new HttpsError("invalid-argument", "Account ID is required.");
    }

    try {
        // Get owner from display ID (validates display and license)
        const { ownerId } = await getOwnerFromDisplayId(displayId);
        console.log(`Creating event for display ${displayId}, owner ${ownerId}`);

        // Use owner's OAuth credentials
        const oauth2Client = await getAuthClient(ownerId, accountId);
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const eventResource: calendar_v3.Schema$Event = {
            summary: event.title,
            description: event.description,
            location: event.location,
            start: event.isAllDay
                ? { date: event.start.split("T")[0] }
                : { dateTime: event.start, timeZone: event.timeZone || "America/Los_Angeles" },
            end: event.isAllDay
                ? { date: event.end.split("T")[0] }
                : { dateTime: event.end, timeZone: event.timeZone || "America/Los_Angeles" },
        };

        // Handle recurrence - use rrule (RFC 5545 format) not recurrence (UI pattern name)
        // event.recurrence contains values like 'none', 'daily', 'weekly' which are NOT valid RRULE strings
        // event.rrule contains the actual RFC 5545 string like 'RRULE:FREQ=DAILY'
        if (event.rrule && typeof event.rrule === 'string' && event.rrule.trim() !== '') {
            console.log('[createDisplayCalendarEvent] Adding rrule to event:', event.rrule);
            eventResource.recurrence = [event.rrule];
        }

        const response = await calendar.events.insert({
            calendarId: calendarId || "primary",
            requestBody: eventResource,
        });

        // Sync calendars to update cache
        await syncCalendarsForUser(ownerId);

        return {
            success: true,
            event: {
                id: response.data.id,
                htmlLink: response.data.htmlLink,
            },
        };
    } catch (error: any) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error creating display event:", error);
        throw new HttpsError("internal", error.message || "Failed to create event");
    }
});

/**
 * Update an existing calendar event using displayId for authorization
 * Parameters: { displayId, calendarId, eventId, event, accountId }
 */
export const updateDisplayCalendarEvent = onCall({ cors: true }, async (request) => {
    const { displayId, calendarId, eventId, event, accountId } = request.data;

    // Validate required parameters
    if (!displayId) {
        throw new HttpsError("invalid-argument", "Display ID is required.");
    }
    if (!eventId) {
        throw new HttpsError("invalid-argument", "Event ID is required.");
    }
    if (!accountId) {
        throw new HttpsError("invalid-argument", "Account ID is required.");
    }

    try {
        // Get owner from display ID (validates display and license)
        const { ownerId } = await getOwnerFromDisplayId(displayId);
        console.log(`Updating event ${eventId} for display ${displayId}, owner ${ownerId}`);

        // Use owner's OAuth credentials
        const oauth2Client = await getAuthClient(ownerId, accountId);
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const eventResource: calendar_v3.Schema$Event = {};

        if (event.title) eventResource.summary = event.title;
        if (event.description !== undefined) eventResource.description = event.description;
        if (event.location !== undefined) eventResource.location = event.location;
        if (event.start) {
            eventResource.start = event.isAllDay
                ? { date: event.start.split("T")[0] }
                : { dateTime: event.start };
        }
        if (event.end) {
            eventResource.end = event.isAllDay
                ? { date: event.end.split("T")[0] }
                : { dateTime: event.end };
        }

        const response = await calendar.events.patch({
            calendarId: calendarId || "primary",
            eventId,
            requestBody: eventResource,
        });

        // Sync calendars to update cache
        await syncCalendarsForUser(ownerId);

        return {
            success: true,
            event: {
                id: response.data.id,
                htmlLink: response.data.htmlLink,
            },
        };
    } catch (error: any) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error updating display event:", error);
        throw new HttpsError("internal", error.message || "Failed to update event");
    }
});

/**
 * Delete a calendar event using displayId for authorization
 * Parameters: { displayId, calendarId, eventId, accountId }
 */
export const deleteDisplayCalendarEvent = onCall({ cors: true }, async (request) => {
    const { displayId, calendarId, eventId, accountId } = request.data;

    // Validate required parameters
    if (!displayId) {
        throw new HttpsError("invalid-argument", "Display ID is required.");
    }
    if (!eventId) {
        throw new HttpsError("invalid-argument", "Event ID is required.");
    }
    if (!accountId) {
        throw new HttpsError("invalid-argument", "Account ID is required.");
    }

    try {
        // Get owner from display ID (validates display and license)
        const { ownerId } = await getOwnerFromDisplayId(displayId);
        console.log(`Deleting event ${eventId} for display ${displayId}, owner ${ownerId}`);

        // Use owner's OAuth credentials
        const oauth2Client = await getAuthClient(ownerId, accountId);
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        await calendar.events.delete({
            calendarId: calendarId || "primary",
            eventId,
        });

        // Sync calendars to update cache
        await syncCalendarsForUser(ownerId);

        return { success: true };
    } catch (error: any) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error deleting display event:", error);
        throw new HttpsError("internal", error.message || "Failed to delete event");
    }
});

/**
 * Sync all calendars for a display owner
 * Parameters: { displayId }
 */
export const syncDisplayCalendars = onCall({ cors: true }, async (request) => {
    const { displayId } = request.data;

    // Validate required parameters
    if (!displayId) {
        throw new HttpsError("invalid-argument", "Display ID is required.");
    }

    try {
        // Get owner from display ID (validates display and license)
        const { ownerId } = await getOwnerFromDisplayId(displayId);
        console.log(`Syncing calendars for display ${displayId}, owner ${ownerId}`);

        // Sync calendars for the owner
        const result = await syncCalendarsForUser(ownerId);

        return {
            success: true,
            calendarsCount: result.calendarsCount,
            eventsCount: result.eventsCount,
        };
    } catch (error: any) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error syncing display calendars:", error);
        throw new HttpsError("internal", error.message || "Failed to sync calendars");
    }
});
