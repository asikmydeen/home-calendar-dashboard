/**
 * Google Calendar Service
 * Client-side service for calling Firebase Functions
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '@/lib/firebase';
import { CalendarEvent } from '@/types/calendar';
import { ConnectedCalendar } from '@/types/account';

// Firebase Functions callables
const getGoogleAuthUrlFn = httpsCallable(functions, 'getGoogleAuthUrl');
const getCalendarListFn = httpsCallable(functions, 'getCalendarList');
const getCalendarEventsFn = httpsCallable(functions, 'getCalendarEvents');
const createCalendarEventFn = httpsCallable(functions, 'createCalendarEvent');
const updateCalendarEventFn = httpsCallable(functions, 'updateCalendarEvent');
const deleteCalendarEventFn = httpsCallable(functions, 'deleteCalendarEvent');
const syncCalendarsFn = httpsCallable(functions, 'syncCalendars');

/**
 * Get Google OAuth URL and redirect user
 */
export async function initiateGoogleAuth(): Promise<void> {
    if (!auth.currentUser) {
        throw new Error('User must be logged in to connect Google Calendar');
    }

    const result = await getGoogleAuthUrlFn();
    const { url } = result.data as { url: string };

    // Redirect to Google OAuth
    window.location.href = url;
}

/**
 * Check if user has Google Calendar connected
 */
export function isGoogleConnected(): boolean {
    // This is a basic check - proper implementation would check Firestore
    return localStorage.getItem('googleCalendarConnected') === 'true';
}

/**
 * Fetch user's Google Calendar list
 */
export async function fetchCalendarList(): Promise<any[]> {
    if (!auth.currentUser) {
        throw new Error('User must be logged in');
    }

    const result = await getCalendarListFn();
    const { calendars } = result.data as { calendars: any[] };

    return calendars.map(cal => ({
        id: cal.id,
        accountId: 'google-primary',
        name: cal.summary,
        color: cal.backgroundColor || '#4285F4',
        isVisible: true,
        isPrimary: cal.primary,
        provider: 'google' as const,
    }));
}

/**
 * Fetch events from all visible calendars
 */
export async function fetchCalendarEvents(
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string
): Promise<any[]> {
    if (!auth.currentUser) {
        throw new Error('User must be logged in');
    }

    const result = await getCalendarEventsFn({
        calendarId,
        timeMin,
        timeMax
    });

    const { events } = result.data as { events: any[] };

    return events.map(evt => ({
        id: evt.id,
        title: evt.title,
        description: evt.description || '',
        start: new Date(evt.start),
        end: new Date(evt.end),
        isAllDay: evt.isAllDay,
        color: evt.calendarColor || '#4285F4',
        category: 'synced' as const,
        calendarId: evt.calendarId,
        location: evt.location,
    }));
}

/**
 * Create a new event
 */
export async function createEvent(
    event: Partial<CalendarEvent>,
    calendarId: string = 'primary'
): Promise<{ id: string }> {
    if (!auth.currentUser) {
        throw new Error('User must be logged in');
    }

    const result = await createCalendarEventFn({
        calendarId,
        event: {
            title: event.title,
            description: event.description,
            start: event.start?.toISOString(),
            end: event.end?.toISOString(),
            isAllDay: event.isAllDay,
            location: event.location,
        },
    });

    const { event: created } = result.data as { success: boolean; event: { id: string } };
    return { id: created.id };
}

/**
 * Update an existing event
 */
export async function updateEvent(
    eventId: string,
    updates: Partial<CalendarEvent>,
    calendarId: string = 'primary'
): Promise<void> {
    if (!auth.currentUser) {
        throw new Error('User must be logged in');
    }

    await updateCalendarEventFn({
        calendarId,
        eventId,
        event: {
            title: updates.title,
            description: updates.description,
            start: updates.start?.toISOString(),
            end: updates.end?.toISOString(),
            isAllDay: updates.isAllDay,
            location: updates.location,
        },
    });
}

/**
 * Delete an event
 */
export async function deleteEvent(
    eventId: string,
    calendarId: string = 'primary'
): Promise<void> {
    if (!auth.currentUser) {
        throw new Error('User must be logged in');
    }

    await deleteCalendarEventFn({ calendarId, eventId });
}

/**
 * Sync all calendars and cache events
 */
export async function syncAllCalendars(): Promise<{ calendarsCount: number; eventsCount: number }> {
    if (!auth.currentUser) {
        throw new Error('User must be logged in');
    }

    const result = await syncCalendarsFn();
    const data = result.data as { success: boolean; calendarsCount: number; eventsCount: number };

    if (data.success) {
        localStorage.setItem('googleCalendarConnected', 'true');
        localStorage.setItem('lastCalendarSync', new Date().toISOString());
    }

    return {
        calendarsCount: data.calendarsCount,
        eventsCount: data.eventsCount,
    };
}
