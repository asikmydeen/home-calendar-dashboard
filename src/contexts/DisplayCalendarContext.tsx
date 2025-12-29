'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { addDays, addWeeks, addMonths, startOfDay, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
    CalendarState,
    CalendarEvent,
    Calendar,
    FamilyMember,
    CalendarViewType,
    DEFAULT_CALENDARS,
} from '@/types/calendar';
import { CalendarAccount } from '@/types/account';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

/**
 * Raw calendar data format from backend getDisplayData response
 */
export interface RawCalendarData {
    events: Array<{
        id: string;
        title: string;
        description?: string;
        location?: string;
        start: string | { _seconds: number; _nanoseconds: number };
        end: string | { _seconds: number; _nanoseconds: number };
        isAllDay?: boolean;
        calendarId: string;
        category?: string;
        color?: string;
        recurrence?: string;
        rrule?: string;
        recurrenceEndDate?: string | { _seconds: number; _nanoseconds: number };
        recurrenceParentId?: string;
        assignedTo?: string[];
        createdAt?: string | { _seconds: number; _nanoseconds: number };
        updatedAt?: string | { _seconds: number; _nanoseconds: number };
        mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
        accountId?: string;
    }>;
    calendars: Array<{
        id: string;
        name: string;
        color: string;
        isVisible?: boolean;
        isDefault?: boolean;
        ownerId?: string;
        type?: string;
        source?: string;
        isFamilyShared?: boolean;
    }>;
    accounts: Array<{
        id: string;
        email: string;
        provider: string;
        displayName?: string;
        familyMemberId?: string;
        linkedMemberId?: string;
    }>;
    lastSyncedAt?: { _seconds: number; _nanoseconds: number } | string | null;
}

/**
 * Display-specific calendar context type
 * Now with full CRUD operations via backend display functions
 */
export interface DisplayCalendarContextType extends Omit<CalendarState, 'isEventModalOpen' | 'editingEvent'> {
    // Display mode identifier
    isDisplayMode: true;
    
    // Accounts for family member display
    accounts: CalendarAccount[];
    lastSyncedAt: Date | null;
    
    // Navigation
    setView: (view: CalendarViewType) => void;
    setDate: (date: Date) => void;
    goToToday: () => void;
    navigatePrev: () => void;
    navigateNext: () => void;
    
    // Visibility toggles (local state only, not persisted)
    toggleCalendarVisibility: (calendarId: string) => void;
    toggleMemberFilter: (memberId: string) => void;
    
    // Computed
    filteredEvents: CalendarEvent[];
    
    // CRUD operations (now functional in display mode)
    dispatch: React.Dispatch<any>;
    addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateEvent: (event: CalendarEvent) => Promise<void>;
    deleteEvent: (eventId: string) => Promise<void>;
    moveEvent: (eventId: string, newStart: Date, newEnd: Date) => Promise<void>;
    syncCalendars: () => Promise<void>;
    
    // Modal state (now functional)
    openEventModal: (event?: CalendarEvent) => void;
    closeEventModal: () => void;
    isEventModalOpen: boolean;
    editingEvent: CalendarEvent | null;
    
    // Loading state for mutations
    isMutating: boolean;
}

// Create context
const DisplayCalendarContext = createContext<DisplayCalendarContextType | null>(null);

/**
 * Convert timestamp from Firestore format or string to Date
 */
function parseTimestamp(value: string | { _seconds: number; _nanoseconds: number } | undefined | null): Date {
    if (!value) return new Date();
    
    if (typeof value === 'string') {
        return new Date(value);
    }
    
    // Firestore Timestamp format
    if (typeof value === 'object' && '_seconds' in value) {
        return new Date(value._seconds * 1000 + (value._nanoseconds || 0) / 1000000);
    }
    
    return new Date();
}

/**
 * Convert raw event data to CalendarEvent type
 */
function convertToCalendarEvent(raw: RawCalendarData['events'][0]): CalendarEvent {
    return {
        id: raw.id,
        title: raw.title,
        description: raw.description,
        location: raw.location,
        start: parseTimestamp(raw.start),
        end: parseTimestamp(raw.end),
        isAllDay: raw.isAllDay ?? false,
        calendarId: raw.calendarId,
        category: (raw.category as CalendarEvent['category']) || 'synced',
        color: raw.color,
        recurrence: (raw.recurrence as CalendarEvent['recurrence']) || 'none',
        rrule: raw.rrule,
        recurrenceEndDate: raw.recurrenceEndDate ? parseTimestamp(raw.recurrenceEndDate) : undefined,
        recurrenceParentId: raw.recurrenceParentId,
        assignedTo: raw.assignedTo || [],
        createdAt: parseTimestamp(raw.createdAt),
        updatedAt: parseTimestamp(raw.updatedAt),
        mealType: raw.mealType,
        // Preserve accountId for filtering logic
        accountId: raw.accountId,
    } as CalendarEvent;
}

/**
 * Check if a calendarId represents an external/synced calendar (Google, etc.)
 * These can be:
 * - google-primary-{accountId} format (from CalendarContext)
 * - Raw Google Calendar IDs like 'en.indian#holiday@group.v.calendar.google.com'
 * - Any calendarId containing '@' or '#' (typical of external calendar IDs)
 */
function isExternalCalendarId(calendarId: string): boolean {
    return calendarId.startsWith('google-') ||
           calendarId.includes('@') ||
           calendarId.includes('#');
}

/**
 * Populate assignedTo for events based on account linkage
 * This mirrors what CalendarContext does when fetching events
 *
 * IMPORTANT: The linkage between accounts and family members is stored in
 * familyMembers[].connectedAccounts[], NOT in the account documents.
 * This is the same approach AccountsContext uses at runtime.
 */
function populateAssignedTo(
    events: CalendarEvent[],
    accounts: RawCalendarData['accounts'],
    familyMembers: FamilyMember[]
): CalendarEvent[] {
    // Build a map of accountId -> memberId and email -> memberId
    // Priority 1: From accounts array (if backend computed linkedMemberId)
    // Priority 2: From familyMembers.connectedAccounts (same as AccountsContext)
    const accountIdToMember = new Map<string, string>();
    const emailToMember = new Map<string, string>();
    
    // First, try to use linkedMemberId from accounts (backend may have computed it)
    accounts.forEach(acc => {
        const memberId = acc.linkedMemberId || acc.familyMemberId;
        if (acc.id && memberId) {
            accountIdToMember.set(acc.id, memberId);
        }
        if (acc.email && memberId) {
            emailToMember.set(acc.email.toLowerCase(), memberId);
        }
    });
    
    // Second, build mapping from familyMembers.connectedAccounts (fallback/primary source)
    // This is the SAME logic AccountsContext uses
    familyMembers.forEach(member => {
        if (member.connectedAccounts && Array.isArray(member.connectedAccounts)) {
            member.connectedAccounts.forEach(acc => {
                if (acc.accountId && !accountIdToMember.has(acc.accountId)) {
                    accountIdToMember.set(acc.accountId, member.id);
                }
                if (acc.email && !emailToMember.has(acc.email.toLowerCase())) {
                    emailToMember.set(acc.email.toLowerCase(), member.id);
                }
            });
        }
    });
    
    console.log('[DisplayCalendarContext] Account to member mapping:', {
        byAccountId: Object.fromEntries(accountIdToMember),
        byEmail: Object.fromEntries(emailToMember),
        familyMembersWithAccounts: familyMembers.filter(m => m.connectedAccounts?.length).map(m => ({
            id: m.id,
            name: m.name,
            connectedAccounts: m.connectedAccounts,
        })),
    });
    
    return events.map(event => {
        // If event already has assignedTo populated, keep it
        if (event.assignedTo && event.assignedTo.length > 0) {
            return event;
        }
        
        // If event has accountId, use it to find the linked member
        const eventWithAccountId = event as CalendarEvent & { accountId?: string };
        if (eventWithAccountId.accountId) {
            const memberId = accountIdToMember.get(eventWithAccountId.accountId);
            if (memberId) {
                return { ...event, assignedTo: [memberId] };
            }
        }
        
        // For external calendar events, try to match by calendarId pattern
        // Format: google-primary-{accountId} or the accountId might be embedded
        if (isExternalCalendarId(event.calendarId)) {
            // Try to extract accountId from calendarId format: google-primary-{accountId}
            if (event.calendarId.startsWith('google-primary-')) {
                const extractedAccountId = event.calendarId.replace('google-primary-', '');
                const memberId = accountIdToMember.get(extractedAccountId);
                if (memberId) {
                    return { ...event, assignedTo: [memberId] };
                }
            }
            
            // If still no match, this event will show under Family calendar
        }
        
        return event;
    });
}

/**
 * Convert raw calendar data to Calendar type
 */
function convertToCalendar(raw: RawCalendarData['calendars'][0]): Calendar {
    return {
        id: raw.id,
        name: raw.name,
        color: raw.color,
        isVisible: raw.isVisible ?? true,
        isDefault: raw.isDefault,
        ownerId: raw.ownerId,
        type: (raw.type as Calendar['type']) || 'other',
        source: (raw.source as Calendar['source']) || 'local',
        isFamilyShared: raw.isFamilyShared,
    };
}

/**
 * Convert raw account data to CalendarAccount type
 */
function convertToAccount(raw: RawCalendarData['accounts'][0]): CalendarAccount {
    return {
        id: raw.id,
        provider: raw.provider as CalendarAccount['provider'],
        email: raw.email,
        displayName: raw.displayName || raw.email,
        familyMemberId: raw.familyMemberId || raw.linkedMemberId || '',
        color: '#6B7280', // Default gray
        isConnected: true,
    };
}

interface DisplayCalendarProviderProps {
    children: ReactNode;
    calendarData: RawCalendarData;
    familyMembers?: FamilyMember[];
    displayId: string;
}

export function DisplayCalendarProvider({
    children,
    calendarData,
    familyMembers = [],
    displayId,
}: DisplayCalendarProviderProps) {
    // DEBUG: Log received props to diagnose Application Error
    console.log('[DisplayCalendarContext] Provider initializing with:', {
        displayId,
        hasCalendarData: !!calendarData,
        hasEvents: !!calendarData?.events,
        eventsLength: calendarData?.events?.length,
        hasCalendars: !!calendarData?.calendars,
        calendarsLength: calendarData?.calendars?.length,
        hasAccounts: !!calendarData?.accounts,
        accountsLength: calendarData?.accounts?.length,
        familyMembersLength: familyMembers?.length,
    });
    
    // Mutable events state (initially from calendarData, updated after mutations)
    // Populate assignedTo based on account linkage (mirrors CalendarContext behavior)
    const [eventsState, setEventsState] = useState<CalendarEvent[]>(() => {
        // Defensive check for missing arrays
        if (!calendarData?.events || !Array.isArray(calendarData.events)) {
            console.error('[DisplayCalendarContext] calendarData.events is missing or not an array:', calendarData?.events);
            return [];
        }
        if (!calendarData?.accounts || !Array.isArray(calendarData.accounts)) {
            console.error('[DisplayCalendarContext] calendarData.accounts is missing or not an array:', calendarData?.accounts);
            return calendarData.events.map(convertToCalendarEvent);
        }
        const rawEvents = calendarData.events.map(convertToCalendarEvent);
        return populateAssignedTo(rawEvents, calendarData.accounts, familyMembers);
    });
    
    // Modal state
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    
    // Loading state for mutations
    const [isMutating, setIsMutating] = useState(false);
    
    // Update events when calendarData or familyMembers changes (e.g., after sync)
    React.useEffect(() => {
        // Defensive check for missing arrays
        if (!calendarData?.events || !Array.isArray(calendarData.events)) {
            console.warn('[DisplayCalendarContext] useEffect: calendarData.events is missing or not an array');
            return;
        }
        if (!calendarData?.accounts || !Array.isArray(calendarData.accounts)) {
            console.warn('[DisplayCalendarContext] useEffect: calendarData.accounts is missing or not an array');
            setEventsState(calendarData.events.map(convertToCalendarEvent));
            return;
        }
        const rawEvents = calendarData.events.map(convertToCalendarEvent);
        setEventsState(populateAssignedTo(rawEvents, calendarData.accounts, familyMembers));
    }, [calendarData.events, calendarData.accounts, familyMembers]);
    
    const calendars = useMemo(() => {
        // Generate member calendars from family members
        // This matches CalendarContext behavior - only show Family + Member calendars
        // NOT the raw Google calendars from backend
        const memberCalendars: Calendar[] = (familyMembers || []).map(m => ({
            id: `cal-${m.id}`,
            name: m.name,
            color: m.color,
            isVisible: true,
            type: 'personal' as const,
            source: 'local' as const,
            ownerId: m.id,
        }));
        
        // Family calendar as the unified view (same as CalendarContext)
        const familyCal = DEFAULT_CALENDARS.find(c => c.type === 'family');
        if (!familyCal) {
            console.error('[DisplayCalendarContext] CRITICAL: Family calendar not found in DEFAULT_CALENDARS');
            // Create a fallback family calendar to prevent crash
            const fallbackFamilyCal: Calendar = {
                id: 'family',
                name: 'Family',
                color: '#ec4899',
                isVisible: true,
                isDefault: true,
                type: 'family',
                source: 'local',
                isFamilyShared: true,
            };
            return [fallbackFamilyCal, ...memberCalendars];
        }
        
        // Return only Family + Member calendars (NOT raw Google calendars)
        // Google events are attributed to members via assignedTo field
        const result = [familyCal, ...memberCalendars];
        
        console.log('[DisplayCalendarContext] calendars computed (Family + Members only):', {
            calendars: result.map(c => ({ id: c.id, name: c.name })),
            familyMembers: (familyMembers || []).map(m => ({ id: m.id, name: m.name })),
            backendCalendarsIgnored: (calendarData?.calendars || []).map(c => c.name),
        });
        
        return result;
    }, [calendarData?.calendars, familyMembers]);
    
    const accounts = useMemo(() =>
        (calendarData?.accounts || []).map(convertToAccount),
        [calendarData?.accounts]
    );
    
    const lastSyncedAt = useMemo(() => 
        calendarData.lastSyncedAt ? parseTimestamp(calendarData.lastSyncedAt) : null,
        [calendarData.lastSyncedAt]
    );

    // Local UI state
    const [currentView, setCurrentView] = useState<CalendarViewType>('month');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    
    // FIX: Sync visibleCalendarIds when calendars change
    // This ensures member calendars are added to visibility after they're generated
    React.useEffect(() => {
        const calendarIds = calendars.map(c => c.id);
        setVisibleCalendarIds(prev => {
            // Add any new calendar IDs that aren't already in the list
            const newIds = calendarIds.filter(id => !prev.includes(id));
            if (newIds.length > 0) {
                console.log('[DisplayCalendarContext] Adding new calendars to visibleCalendarIds:', newIds);
                return [...prev, ...newIds];
            }
            // If no calendars are visible yet, initialize with all
            if (prev.length === 0 && calendarIds.length > 0) {
                console.log('[DisplayCalendarContext] Initializing visibleCalendarIds:', calendarIds);
                return calendarIds;
            }
            return prev;
        });
    }, [calendars]);
    
    // DEBUG: Log state for troubleshooting
    React.useEffect(() => {
        const externalEvents = eventsState.filter(e => isExternalCalendarId(e.calendarId));
        const assignedEvents = externalEvents.filter(e => e.assignedTo && e.assignedTo.length > 0);
        
        console.log('[DisplayCalendarContext] State check:', {
            currentView,
            visibleCalendarIds,
            calendarsIds: calendars.map(c => c.id),
            eventsCount: eventsState.length,
            externalEventsCount: externalEvents.length,
            assignedEventsCount: assignedEvents.length,
            unassignedExternalCount: externalEvents.length - assignedEvents.length,
            sampleEvent: eventsState[0] ? {
                id: eventsState[0].id,
                calendarId: eventsState[0].calendarId,
                assignedTo: eventsState[0].assignedTo,
                isExternal: isExternalCalendarId(eventsState[0].calendarId),
            } : null,
            accountsForLinking: (calendarData?.accounts || []).map(a => ({
                id: a.id,
                email: a.email,
                linkedMemberId: a.linkedMemberId || a.familyMemberId,
            })),
        });
    }, [currentView, visibleCalendarIds, calendars, eventsState, calendarData.accounts]);

    // Navigation callbacks
    const setView = useCallback((view: CalendarViewType) => {
        setCurrentView(view);
    }, []);

    const setDate = useCallback((date: Date) => {
        setSelectedDate(date);
    }, []);

    const goToToday = useCallback(() => {
        setSelectedDate(new Date());
    }, []);

    const navigatePrev = useCallback(() => {
        setSelectedDate(prev => {
            switch (currentView) {
                case 'day':
                    return addDays(prev, -1);
                case 'week':
                    return addWeeks(prev, -1);
                case 'month':
                case 'agenda':
                default:
                    return addMonths(prev, -1);
            }
        });
    }, [currentView]);

    const navigateNext = useCallback(() => {
        setSelectedDate(prev => {
            switch (currentView) {
                case 'day':
                    return addDays(prev, 1);
                case 'week':
                    return addWeeks(prev, 1);
                case 'month':
                case 'agenda':
                default:
                    return addMonths(prev, 1);
            }
        });
    }, [currentView]);

    // Visibility toggles
    const toggleCalendarVisibility = useCallback((calendarId: string) => {
        setVisibleCalendarIds(prev => 
            prev.includes(calendarId)
                ? prev.filter(id => id !== calendarId)
                : [...prev, calendarId]
        );
    }, []);

    const toggleMemberFilter = useCallback((memberId: string) => {
        setSelectedMemberIds(prev => 
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    }, []);

    // Expand recurring events (simplified version for display)
    const expandedEvents = useMemo(() => {
        // For display mode, we expect the backend to have already expanded recurring events
        // or we show them as-is. If needed, we can add RRule expansion here later.
        return eventsState;
    }, [eventsState]);

    // Filter events based on visibility and member filters
    const filteredEvents = useMemo(() => {
        return expandedEvents.filter(event => {
            // For external/synced calendar events (Google, etc.), determine visibility by assignedTo
            // This handles both 'google-primary-xxx' format AND raw Google Calendar IDs
            // like 'en.indian#holiday@group.v.calendar.google.com' or 'xxx@group.v.calendar.google.com'
            if (isExternalCalendarId(event.calendarId)) {
                // Strict check: If event has assigned members, show ONLY if their personal calendar is visible
                if (event.assignedTo && event.assignedTo.length > 0) {
                    const memberVisible = event.assignedTo.some(memberId =>
                        visibleCalendarIds.includes(`cal-${memberId}`)
                    );
                    if (!memberVisible) return false;
                } else {
                    // Fallback: Only for unassigned events, show if Family calendar is visible
                    if (!visibleCalendarIds.includes('family')) {
                        return false;
                    }
                }
            } else {
                // For local events, use direct calendarId matching
                if (!visibleCalendarIds.includes(event.calendarId)) {
                    return false;
                }
            }

            // Apply member filter if any members are selected
            if (selectedMemberIds.length > 0) {
                if (event.assignedTo && event.assignedTo.length > 0) {
                    const hasMatchingMember = event.assignedTo.some(memberId =>
                        selectedMemberIds.includes(memberId)
                    );
                    if (!hasMatchingMember) return false;
                }
            }
            return true;
        });
    }, [expandedEvents, visibleCalendarIds, selectedMemberIds]);

    // Modal handlers
    const openEventModal = useCallback((event?: CalendarEvent) => {
        setEditingEvent(event || null);
        setIsEventModalOpen(true);
    }, []);

    const closeEventModal = useCallback(() => {
        setIsEventModalOpen(false);
        setEditingEvent(null);
    }, []);

    // Sync calendars - calls syncDisplayCalendars and updates local state
    const syncCalendars = useCallback(async () => {
        if (!displayId) return;
        
        setIsMutating(true);
        try {
            const syncDisplayCalendars = httpsCallable(functions, 'syncDisplayCalendars');
            const result = await syncDisplayCalendars({ displayId });
            const data = result.data as { events?: RawCalendarData['events'] };
            
            // Update events with synced data if returned
            // Apply populateAssignedTo to ensure events are linked to members
            if (data.events) {
                const rawEvents = data.events.map(convertToCalendarEvent);
                setEventsState(populateAssignedTo(rawEvents, calendarData.accounts, familyMembers));
            }
        } catch (error) {
            console.error('[DisplayCalendarContext] Failed to sync calendars:', error);
            throw error;
        } finally {
            setIsMutating(false);
        }
    }, [displayId, calendarData.accounts, familyMembers]);

    // Add event - calls createDisplayCalendarEvent
    const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!displayId) {
            console.error('[DisplayCalendarContext] Cannot add event: no displayId');
            return;
        }
        
        setIsMutating(true);
        
        // Determine the target calendar and account
        const calendarId = event.calendarId;
        let accountId: string | undefined;
        
        console.log('[DisplayCalendarContext] addEvent - deriving accountId:', {
            calendarId,
            assignedTo: event.assignedTo,
            availableAccounts: accounts.map(a => ({ id: a.id, email: a.email, provider: a.provider, familyMemberId: a.familyMemberId })),
        });
        
        // Step 1: Try to get accountId from calendarId if it's a google-primary calendar
        if (calendarId.startsWith('google-primary-')) {
            accountId = calendarId.replace('google-primary-', '');
            console.log(`[DisplayCalendarContext] accountId derived from calendarId: ${accountId}`);
        }
        
        // Step 2: If not found, try to get from assigned member
        if (!accountId && event.assignedTo?.[0]) {
            const assignedMemberId = event.assignedTo[0];
            const account = accounts.find(a => a.familyMemberId === assignedMemberId);
            if (account) {
                accountId = account.id;
                console.log(`[DisplayCalendarContext] accountId derived from assigned member (${assignedMemberId}): ${accountId}`);
            } else {
                console.log(`[DisplayCalendarContext] No account found for assigned member: ${assignedMemberId}`);
            }
        }
        
        // Step 3: Fallback - use the first available Google account
        if (!accountId && accounts.length > 0) {
            const googleAccount = accounts.find(a => a.provider === 'google');
            if (googleAccount) {
                accountId = googleAccount.id;
                console.log(`[DisplayCalendarContext] Using default Google account as fallback: ${accountId} (${googleAccount.email})`);
            }
        }
        
        // Step 4: Error if still no account found
        if (!accountId) {
            const error = new Error('No Google account available. Please connect a Google account first.');
            console.error('[DisplayCalendarContext] Failed to derive accountId:', error.message);
            setIsMutating(false);
            throw error;
        }
        
        console.log(`[DisplayCalendarContext] Final accountId for event creation: ${accountId}`);
        
        try {
            const createDisplayCalendarEvent = httpsCallable(functions, 'createDisplayCalendarEvent');
            
            // Prepare event data for backend (convert Date objects to ISO strings)
            const eventData = {
                title: event.title,
                description: event.description,
                location: event.location,
                start: event.start.toISOString(),
                end: event.end.toISOString(),
                isAllDay: event.isAllDay,
                category: event.category,
                recurrence: event.recurrence,
                rrule: event.rrule,
                assignedTo: event.assignedTo,
            };
            
            const result = await createDisplayCalendarEvent({
                displayId,
                calendarId: accountId ? 'primary' : calendarId,
                event: eventData,
                accountId,
            });
            
            const data = result.data as { eventId?: string; event?: RawCalendarData['events'][0] };
            
            // Optimistically add to local state
            if (data.event) {
                setEventsState(prev => [...prev, convertToCalendarEvent(data.event!)]);
            } else if (data.eventId) {
                // Add with the returned ID
                const newEvent: CalendarEvent = {
                    ...event,
                    id: data.eventId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                setEventsState(prev => [...prev, newEvent]);
            }
            
            // Sync to get the latest state
            await syncCalendars();
            
        } catch (error) {
            console.error('[DisplayCalendarContext] Failed to add event:', error);
            throw error;
        } finally {
            setIsMutating(false);
        }
    }, [displayId, accounts, syncCalendars]);

    // Update event - calls updateDisplayCalendarEvent
    const updateEvent = useCallback(async (event: CalendarEvent) => {
        if (!displayId) {
            console.error('[DisplayCalendarContext] Cannot update event: no displayId');
            return;
        }
        
        setIsMutating(true);
        
        // Optimistically update local state
        setEventsState(prev => prev.map(e => e.id === event.id ? event : e));
        
        // Determine accountId
        let accountId: string | undefined;
        let googleEventId = event.id;
        
        if (event.id.startsWith('google-')) {
            // Parse composite ID: google-{accountId}-{eventId}
            const parts = event.id.split('-');
            if (parts.length >= 3) {
                accountId = parts[1];
                googleEventId = parts.slice(2).join('-');
            }
        }
        
        try {
            const updateDisplayCalendarEvent = httpsCallable(functions, 'updateDisplayCalendarEvent');
            
            // Prepare event data for backend
            const eventData = {
                title: event.title,
                description: event.description,
                location: event.location,
                start: event.start.toISOString(),
                end: event.end.toISOString(),
                isAllDay: event.isAllDay,
                category: event.category,
                recurrence: event.recurrence,
                rrule: event.rrule,
                assignedTo: event.assignedTo,
            };
            
            await updateDisplayCalendarEvent({
                displayId,
                calendarId: accountId ? 'primary' : event.calendarId,
                eventId: googleEventId,
                event: eventData,
                accountId,
            });
            
            // Sync to get the latest state
            await syncCalendars();
            
        } catch (error) {
            console.error('[DisplayCalendarContext] Failed to update event:', error);
            // Rollback optimistic update
            setEventsState(calendarData.events.map(convertToCalendarEvent));
            throw error;
        } finally {
            setIsMutating(false);
        }
    }, [displayId, calendarData.events, syncCalendars]);

    // Delete event - calls deleteDisplayCalendarEvent
    const deleteEvent = useCallback(async (eventId: string) => {
        if (!displayId) {
            console.error('[DisplayCalendarContext] Cannot delete event: no displayId');
            return;
        }
        
        setIsMutating(true);
        
        // Find the event to delete
        const event = eventsState.find(e => e.id === eventId);
        if (!event) {
            console.error('[DisplayCalendarContext] Event not found:', eventId);
            setIsMutating(false);
            return;
        }
        
        // Optimistically remove from local state
        setEventsState(prev => prev.filter(e => e.id !== eventId));
        
        // Determine accountId
        let accountId: string | undefined;
        let googleEventId = eventId;
        
        if (eventId.startsWith('google-')) {
            // Parse composite ID: google-{accountId}-{eventId}
            const parts = eventId.split('-');
            if (parts.length >= 3) {
                accountId = parts[1];
                googleEventId = parts.slice(2).join('-');
            }
        }
        
        try {
            const deleteDisplayCalendarEvent = httpsCallable(functions, 'deleteDisplayCalendarEvent');
            
            await deleteDisplayCalendarEvent({
                displayId,
                calendarId: accountId ? 'primary' : event.calendarId,
                eventId: googleEventId,
                accountId,
            });
            
            // Sync to get the latest state
            await syncCalendars();
            
        } catch (error: any) {
            console.error('[DisplayCalendarContext] Failed to delete event:', error);
            
            // If not a "not found" error, rollback
            const isNotFound = error.code === 404 ||
                error.message?.includes('Not Found') ||
                error.toString().includes('Not Found');
                
            if (!isNotFound) {
                // Rollback optimistic update
                setEventsState(calendarData.events.map(convertToCalendarEvent));
            }
            throw error;
        } finally {
            setIsMutating(false);
        }
    }, [displayId, eventsState, calendarData.events, syncCalendars]);

    // Move event - convenience function that updates start/end times
    const moveEvent = useCallback(async (eventId: string, newStart: Date, newEnd: Date) => {
        const event = eventsState.find(e => e.id === eventId);
        if (event) {
            await updateEvent({ ...event, start: newStart, end: newEnd });
        }
    }, [eventsState, updateEvent]);

    // No-op dispatch for compatibility
    const noopDispatch = useCallback(() => {}, []);

    const value: DisplayCalendarContextType = {
        // Display mode identifier
        isDisplayMode: true,
        
        // State
        currentView,
        selectedDate,
        events: expandedEvents,
        calendars,
        familyMembers,
        visibleCalendarIds,
        selectedMemberIds,
        isLoading: false,
        
        // Display-specific
        accounts,
        lastSyncedAt,
        
        // Navigation
        setView,
        setDate,
        goToToday,
        navigatePrev,
        navigateNext,
        
        // Visibility
        toggleCalendarVisibility,
        toggleMemberFilter,
        
        // Computed
        filteredEvents,
        
        // CRUD operations
        dispatch: noopDispatch,
        addEvent,
        updateEvent,
        deleteEvent,
        moveEvent,
        syncCalendars,
        
        // Modal state
        openEventModal,
        closeEventModal,
        isEventModalOpen,
        editingEvent,
        
        // Loading state
        isMutating,
    };

    return (
        <DisplayCalendarContext.Provider value={value}>
            {children}
        </DisplayCalendarContext.Provider>
    );
}

/**
 * Hook to access display calendar context
 * Returns null if not within a DisplayCalendarProvider
 */
export function useDisplayCalendar(): DisplayCalendarContextType | null {
    return useContext(DisplayCalendarContext);
}

/**
 * Export the context itself for use in CalendarContext's useCalendar hook
 */
export { DisplayCalendarContext };
