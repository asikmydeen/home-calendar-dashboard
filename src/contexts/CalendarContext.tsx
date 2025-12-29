'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import { addDays, addWeeks, addMonths, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import {
    CalendarState,
    CalendarAction,
    CalendarEvent,
    Calendar,
    FamilyMember,
    CalendarViewType,
    DEFAULT_CALENDARS,
    DEFAULT_FAMILY_MEMBERS,
} from '@/types/calendar';
import { RRule } from 'rrule';

import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { useAccounts } from './AccountsContext';
import { DisplayCalendarContext, DisplayCalendarContextType } from './DisplayCalendarContext';

// Storage keys
const STORAGE_KEY = 'home-calendar-events-v2';

// ============================================================================
// MODULE-LEVEL PERMANENT BLOCKLIST FOR FAILED ACCOUNTS
// This survives component re-mounts and prevents retrying accounts that have
// failed with non-retryable errors (auth expired, quota exceeded, etc.)
// NOTE: Accounts with needsReauth flag are NOT permanently blocked - they are
// just skipped temporarily until reconnected. Only actual API failures result
// in permanent blocking.
// ============================================================================
const PERMANENTLY_FAILED_ACCOUNTS = new Set<string>();

// Non-retryable error patterns - these should NEVER be retried
// NOTE: These are actual API errors, not flags set on the account
const NON_RETRYABLE_ERROR_PATTERNS = [
    'authorization expired',
    'invalid_grant',
    'invalid_token',
    'Token has been expired or revoked',
    'Quota exceeded',
    'rate limit',
    'PERMISSION_DENIED',
    'access_denied',
    'Please reconnect your Google account',
];

/**
 * Check if an error message indicates a non-retryable failure
 */
function isNonRetryableError(errorMessage: string): boolean {
    const lowerMessage = errorMessage.toLowerCase();
    return NON_RETRYABLE_ERROR_PATTERNS.some(pattern =>
        lowerMessage.includes(pattern.toLowerCase())
    );
}

/**
 * Mark an account as permanently failed (module-level, survives re-mounts)
 */
function markAccountAsPermanentlyFailed(accountId: string, reason: string): void {
    if (!PERMANENTLY_FAILED_ACCOUNTS.has(accountId)) {
        console.warn(`[CalendarContext] PERMANENTLY blocking account ${accountId}: ${reason}`);
        PERMANENTLY_FAILED_ACCOUNTS.add(accountId);
    }
}

/**
 * Check if an account is permanently blocked
 */
function isAccountPermanentlyBlocked(accountId: string): boolean {
    return PERMANENTLY_FAILED_ACCOUNTS.has(accountId);
}

/**
 * Clear an account from the permanent blocklist (called when account is reconnected)
 * This allows the account to be fetched again after successful re-authentication
 */
export function clearAccountFromBlocklist(accountId: string): void {
    if (PERMANENTLY_FAILED_ACCOUNTS.has(accountId)) {
        console.log(`[CalendarContext] Clearing account ${accountId} from blocklist`);
        PERMANENTLY_FAILED_ACCOUNTS.delete(accountId);
    }
}

// Initial state
const initialState: CalendarState = {
    currentView: 'month',
    selectedDate: new Date(),
    events: [],
    calendars: DEFAULT_CALENDARS,
    familyMembers: [], // Will be populated from HouseholdContext
    visibleCalendarIds: DEFAULT_CALENDARS.map(c => c.id),
    selectedMemberIds: [],
    isEventModalOpen: false,
    editingEvent: null,
    isLoading: true,
};



// Reducer
function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
    switch (action.type) {
        case 'SET_VIEW':
            return { ...state, currentView: action.payload };

        case 'SET_DATE':
            return { ...state, selectedDate: action.payload };

        case 'GO_TO_TODAY':
            return { ...state, selectedDate: new Date() };

        case 'NAVIGATE_PREV': {
            const { currentView, selectedDate } = state;
            let newDate: Date;
            switch (currentView) {
                case 'day':
                    newDate = addDays(selectedDate, -1);
                    break;
                case 'week':
                    newDate = addWeeks(selectedDate, -1);
                    break;
                case 'month':
                case 'agenda':
                default:
                    newDate = addMonths(selectedDate, -1);
                    break;
            }
            return { ...state, selectedDate: newDate };
        }

        case 'NAVIGATE_NEXT': {
            const { currentView, selectedDate } = state;
            let newDate: Date;
            switch (currentView) {
                case 'day':
                    newDate = addDays(selectedDate, 1);
                    break;
                case 'week':
                    newDate = addWeeks(selectedDate, 1);
                    break;
                case 'month':
                case 'agenda':
                default:
                    newDate = addMonths(selectedDate, 1);
                    break;
            }
            return { ...state, selectedDate: newDate };
        }

        case 'ADD_EVENT': {
            const newEvent: CalendarEvent = {
                ...action.payload,
                id: crypto.randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            return { ...state, events: [...state.events, newEvent] };
        }

        case 'UPDATE_EVENT': {
            const updatedEvent = { ...action.payload, updatedAt: new Date() };
            return {
                ...state,
                events: state.events.map(e => (e.id === updatedEvent.id ? updatedEvent : e)),
            };
        }

        case 'DELETE_EVENT':
            return {
                ...state,
                events: state.events.filter(e => e.id !== action.payload),
            };

        case 'MOVE_EVENT': {
            const { eventId, newStart, newEnd } = action.payload;
            return {
                ...state,
                events: state.events.map(e =>
                    e.id === eventId
                        ? { ...e, start: newStart, end: newEnd, updatedAt: new Date() }
                        : e
                ),
            };
        }

        case 'TOGGLE_CALENDAR_VISIBILITY': {
            const calendarId = action.payload;
            const isVisible = state.visibleCalendarIds.includes(calendarId);
            return {
                ...state,
                visibleCalendarIds: isVisible
                    ? state.visibleCalendarIds.filter(id => id !== calendarId)
                    : [...state.visibleCalendarIds, calendarId],
            };
        }

        case 'TOGGLE_MEMBER_FILTER': {
            const memberId = action.payload;
            const isSelected = state.selectedMemberIds.includes(memberId);
            return {
                ...state,
                selectedMemberIds: isSelected
                    ? state.selectedMemberIds.filter(id => id !== memberId)
                    : [...state.selectedMemberIds, memberId],
            };
        }

        case 'OPEN_EVENT_MODAL':
            return {
                ...state,
                isEventModalOpen: true,
                editingEvent: action.payload || null,
            };

        case 'CLOSE_EVENT_MODAL':
            return {
                ...state,
                isEventModalOpen: false,
                editingEvent: null,
            };

        case 'SET_EVENTS':
            return { ...state, events: action.payload };

        case 'SET_CALENDARS': {
            const newCalendars = action.payload;
            const currentCalendarIds = state.calendars.map(c => c.id);
            const newCalendarIds = newCalendars.map(c => c.id);

            // Find IDs that are completely new to the system
            const addedIds = newCalendarIds.filter(id => !currentCalendarIds.includes(id));

            return {
                ...state,
                calendars: newCalendars,
                // Default new calendars to visible
                visibleCalendarIds: [...state.visibleCalendarIds, ...addedIds]
            };
        }

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        default:
            return state;
    }
}

// Context
interface CalendarContextType extends CalendarState {
    dispatch: React.Dispatch<CalendarAction>;
    // Convenience actions
    setView: (view: CalendarViewType) => void;
    setDate: (date: Date) => void;
    goToToday: () => void;
    navigatePrev: () => void;
    navigateNext: () => void;
    addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateEvent: (event: CalendarEvent) => void;
    deleteEvent: (eventId: string) => void;
    moveEvent: (eventId: string, newStart: Date, newEnd: Date) => void;
    openEventModal: (event?: CalendarEvent) => void;
    closeEventModal: () => void;
    toggleCalendarVisibility: (calendarId: string) => void;
    toggleMemberFilter: (memberId: string) => void;
    // Member management REMOVED - use HouseholdContext
    // Computed
    filteredEvents: CalendarEvent[];
}

const CalendarContext = createContext<CalendarContextType | null>(null);

// Provider
interface CalendarProviderProps {
    children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
    const [state, dispatch] = useReducer(calendarReducer, initialState);
    const { user, loading: authLoading } = useAuth();
    const { familyMembers } = useHousehold();
    const { accounts } = useAccounts();

    // ========================================================================
    // REFS FOR TRACKING FETCH STATE (no state to avoid re-render loops)
    // ========================================================================
    
    // Prevent concurrent fetches - using ref to avoid re-render triggers
    const isFetchingRef = useRef(false);
    
    // Track retry counts per account (ref, not state)
    const retryCountsRef = useRef<Map<string, number>>(new Map());
    const MAX_RETRIES = 3;
    
    // Debounce timer ref
    const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    
    // Track the last fetch timestamp to implement rate limiting
    const lastFetchTimeRef = useRef<number>(0);
    const MIN_FETCH_INTERVAL_MS = 5000; // Minimum 5 seconds between fetches

    // Keep refs for use without triggering re-effects
    const familyMembersRef = useRef(familyMembers);
    const accountsRef = useRef(accounts);
    useEffect(() => {
        familyMembersRef.current = familyMembers;
        accountsRef.current = accounts;
    }, [familyMembers, accounts]);

    // ========================================================================
    // STABLE DEPENDENCY: Create a stable string key from account IDs
    // This prevents re-triggering when account objects get new references
    // but their IDs haven't actually changed
    // ========================================================================
    const accountIdsKey = useMemo(() => {
        return accounts
            .map(acc => acc.accountId)
            .sort()
            .join(',');
    }, [accounts]);

    // Stable date key (YYYY-MM format) to only re-fetch on month changes
    const selectedMonthKey = useMemo(() => {
        const d = state.selectedDate;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }, [state.selectedDate]);

    // Load events from localStorage on mount (only user-created local events)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Only load local events from storage, synced events come from Firestore
                const events = parsed.map((e: any) => ({
                    ...e,
                    start: new Date(e.start),
                    end: new Date(e.end),
                    createdAt: new Date(e.createdAt),
                    updatedAt: new Date(e.updatedAt),
                })).filter((e: CalendarEvent) => !e.id.startsWith('google-'));
                dispatch({ type: 'SET_EVENTS', payload: events });
            }
        } catch (error) {
            console.error('Failed to load calendar events:', error);
        }
        dispatch({ type: 'SET_LOADING', payload: false });
    }, []);

    // ========================================================================
    // MAIN FETCH EFFECT - Load events from Google Calendar (Client-side Sync)
    // ========================================================================
    useEffect(() => {
        let isMounted = true;

        const fetchExternalEvents = async () => {
            // ================================================================
            // GUARD 1: Auth checks
            // ================================================================
            if (authLoading) {
                console.log('[CalendarContext] Skipping fetch - auth still loading');
                return;
            }
            if (!user) {
                console.log('[CalendarContext] Skipping fetch - no user');
                return;
            }
            
            // ================================================================
            // GUARD 2: Check if we have any accounts at all
            // ================================================================
            const currentAccounts = accountsRef.current;
            if (!currentAccounts || currentAccounts.length === 0) {
                console.log('[CalendarContext] Skipping fetch - no accounts configured');
                return;
            }
            
            // ================================================================
            // GUARD 3: Filter to only fetchable accounts BEFORE starting
            // ================================================================
            const fetchableAccounts = currentAccounts.filter(acc => {
                // Check module-level permanent blocklist FIRST
                // BUT: if the account no longer has needsReauth flag, it may have been reconnected
                // In that case, clear it from the blocklist and allow retry
                if (isAccountPermanentlyBlocked(acc.accountId)) {
                    // Check if account has been reconnected (needsReauth is now false)
                    const accountNeedsReauth = (acc as any).needsReauth || (acc as any).authError;
                    if (!accountNeedsReauth) {
                        // Account was reconnected! Clear from blocklist and allow retry
                        console.log(`[CalendarContext] Account ${acc.accountId} was reconnected - clearing from blocklist`);
                        clearAccountFromBlocklist(acc.accountId);
                        // Also reset retry count for this account
                        retryCountsRef.current.delete(acc.accountId);
                        // Continue to check other conditions (don't return false)
                    } else {
                        console.log(`[CalendarContext] Account ${acc.accountId} is PERMANENTLY blocked`);
                        return false;
                    }
                }
                
                // Check account flags for needing reauth
                // IMPORTANT: Do NOT permanently block accounts that just need reauth
                // They should be skipped temporarily and will work again after reconnection
                if ((acc as any).needsReauth || (acc as any).authError) {
                    console.log(`[CalendarContext] Skipping ${acc.accountId} - needs reauth (temporary skip, not blocking)`);
                    // Don't call markAccountAsPermanentlyFailed - just skip temporarily
                    return false;
                }
                
                // Check retry count
                const currentRetries = retryCountsRef.current.get(acc.accountId) || 0;
                if (currentRetries >= MAX_RETRIES) {
                    console.log(`[CalendarContext] Skipping ${acc.accountId} - max retries exceeded`);
                    markAccountAsPermanentlyFailed(acc.accountId, 'max retries exceeded');
                    return false;
                }
                
                return true;
            });
            
            // If ALL accounts are blocked/unfetchable, don't proceed
            if (fetchableAccounts.length === 0) {
                console.log('[CalendarContext] All accounts are blocked or need reauth - stopping fetch loop');
                return;
            }
            
            // ================================================================
            // GUARD 4: Prevent concurrent fetches
            // ================================================================
            if (isFetchingRef.current) {
                console.log('[CalendarContext] Skipping fetch - already in progress');
                return;
            }
            
            // ================================================================
            // GUARD 5: Rate limiting - minimum interval between fetches
            // ================================================================
            const now = Date.now();
            const timeSinceLastFetch = now - lastFetchTimeRef.current;
            if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
                console.log(`[CalendarContext] Rate limited - ${MIN_FETCH_INTERVAL_MS - timeSinceLastFetch}ms until next fetch allowed`);
                return;
            }
            
            // ================================================================
            // START FETCH
            // ================================================================
            isFetchingRef.current = true;
            lastFetchTimeRef.current = now;
            
            console.log(`[CalendarContext] Starting fetch for ${fetchableAccounts.length} accounts`);

            // Determine date range based on view
            const startRange = new Date(state.selectedDate);
            startRange.setMonth(startRange.getMonth() - 1);
            startRange.setDate(1);

            const endRange = new Date(state.selectedDate);
            endRange.setMonth(endRange.getMonth() + 2);
            endRange.setDate(0);

            try {
                const { fetchCalendarEvents } = await import('@/lib/googleCalendar');
                let allGoogleEvents: CalendarEvent[] = [];

                // Process each fetchable account
                await Promise.all(fetchableAccounts.map(async (acc) => {
                    try {
                        const events = await fetchCalendarEvents(
                            'primary',
                            startRange.toISOString(),
                            endRange.toISOString(),
                            acc.accountId
                        );

                        // Success! Reset retry count
                        retryCountsRef.current.delete(acc.accountId);
                        
                        console.log(`[CalendarContext] Account ${acc.accountId} (${acc.email}) fetched ${events.length} events`);

                        // Transform to app format
                        const mappedEvents = events.map(e => ({
                            ...e,
                            id: `google-${acc.accountId}-${e.id}`,
                            accountId: acc.accountId,
                            calendarId: `google-primary-${acc.accountId}`,
                            category: 'synced',
                            start: new Date(e.start),
                            end: new Date(e.end),
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            recurrence: 'none' as const,
                            assignedTo: acc.linkedMemberId ? [acc.linkedMemberId] : [],
                        }));
                        allGoogleEvents.push(...mappedEvents);
                        
                    } catch (err) {
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        
                        // Use the module-level helper to check if non-retryable
                        if (isNonRetryableError(errorMessage)) {
                            // PERMANENTLY block this account at module level
                            markAccountAsPermanentlyFailed(acc.accountId, errorMessage);
                        } else {
                            // Increment retry count for retryable errors
                            const currentRetries = retryCountsRef.current.get(acc.accountId) || 0;
                            const newRetryCount = currentRetries + 1;
                            retryCountsRef.current.set(acc.accountId, newRetryCount);
                            console.log(`[CalendarContext] Retryable error for ${acc.accountId} (attempt ${newRetryCount}/${MAX_RETRIES}): ${errorMessage}`);
                            
                            // If we just hit max retries, also permanently block
                            if (newRetryCount >= MAX_RETRIES) {
                                markAccountAsPermanentlyFailed(acc.accountId, `max retries exceeded after: ${errorMessage}`);
                            }
                        }
                        
                        console.error(`[CalendarContext] Failed to fetch for ${acc.accountId}:`, errorMessage);
                        // Continue with next account - don't throw
                    }
                }));

                if (isMounted) {
                    // Merge with local events
                    const stored = localStorage.getItem(STORAGE_KEY);
                    const localEvents = stored ? JSON.parse(stored).map((e: any) => ({
                        ...e,
                        start: new Date(e.start),
                        end: new Date(e.end),
                        createdAt: new Date(e.createdAt),
                        updatedAt: new Date(e.updatedAt),
                    })).filter((e: CalendarEvent) =>
                        !e.id.startsWith('google-') &&
                        !e.calendarId.startsWith('google-')
                    ) : [];

                    dispatch({ type: 'SET_EVENTS', payload: [...localEvents, ...allGoogleEvents] });
                }

            } catch (error) {
                console.error('[CalendarContext] Critical error in fetchExternalEvents:', error);
            } finally {
                // ALWAYS reset the fetching flag
                isFetchingRef.current = false;
            }
        };

        // ====================================================================
        // DEBOUNCED EXECUTION
        // Clear any pending fetch and schedule a new one
        // ====================================================================
        if (fetchDebounceRef.current) {
            clearTimeout(fetchDebounceRef.current);
        }
        
        fetchDebounceRef.current = setTimeout(() => {
            fetchExternalEvents();
        }, 300); // 300ms debounce

        return () => {
            isMounted = false;
            if (fetchDebounceRef.current) {
                clearTimeout(fetchDebounceRef.current);
            }
        };
    // ========================================================================
    // STABLE DEPENDENCIES ONLY:
    // - accountIdsKey: stable string, only changes when account IDs actually change
    // - selectedMonthKey: stable string, only changes on month change
    // - user: user object (stable from Firebase)
    // - authLoading: boolean
    // ========================================================================
    }, [accountIdsKey, selectedMonthKey, user, authLoading]);

    // Save events to localStorage on change
    useEffect(() => {
        if (!state.isLoading) {
            // Only save pure local events (not Google synced, not Google optimistic)
            const localEvents = state.events.filter(e =>
                !e.id.startsWith('google-') &&
                !e.calendarId.startsWith('google-')
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localEvents));
        }
    }, [state.events, state.isLoading]);

    // Sync members and auto-generate calendars
    // NOTE: We now only show Member calendars (Dad, Mom, etc.) + Family
    // Google accounts are NOT shown as separate calendars - their events are 
    // attributed to the member they're linked to via assignedTo field
    useEffect(() => {
        // Generate personal calendars for members only
        const memberCalendars: Calendar[] = familyMembers.map((m: FamilyMember) => {
            return {
                id: `cal-${m.id}`,
                name: m.name,
                color: m.color,
                isVisible: true,
                type: 'personal',
                source: 'local',
                ownerId: m.id,
            };
        });

        // Family calendar as the unified view
        const familyCal = DEFAULT_CALENDARS.find(c => c.type === 'family')!;
        const newCalendars = [familyCal, ...memberCalendars];

        // We still need to track Google calendar IDs internally for event routing
        // but we don't expose them as visible "calendars" in the UI
        // Instead, those events will be filtered by assignedTo

        const currentCalIds = state.calendars.map(c => c.id).sort().join(',');
        const newCalIds = newCalendars.map(c => c.id).sort().join(',');

        if (currentCalIds !== newCalIds || state.calendars.length !== newCalendars.length) {
            dispatch({ type: 'SET_CALENDARS', payload: newCalendars });
        }

    }, [familyMembers, accounts]);

    const setView = useCallback((view: CalendarViewType) => {
        dispatch({ type: 'SET_VIEW', payload: view });
    }, []);

    const setDate = useCallback((date: Date) => {
        dispatch({ type: 'SET_DATE', payload: date });
    }, []);

    const goToToday = useCallback(() => {
        dispatch({ type: 'GO_TO_TODAY' });
    }, []);

    const navigatePrev = useCallback(() => {
        dispatch({ type: 'NAVIGATE_PREV' });
    }, []);

    const navigateNext = useCallback(() => {
        dispatch({ type: 'NAVIGATE_NEXT' });
    }, []);

    const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
        // Find which account this calendar belongs to
        const targetCalendar = state.calendars.find(c => c.id === event.calendarId);
        const isGoogle = targetCalendar?.source === 'google' || event.calendarId.startsWith('google-');

        // Optimistically add to local state
        const tempId = crypto.randomUUID();
        const optimisticEvent = {
            ...event,
            id: tempId,
            // Ensure color matches calendar if not set
            color: event.color || targetCalendar?.color
        };

        dispatch({
            type: 'ADD_EVENT',
            payload: optimisticEvent as any
        });

        if (isGoogle) {
            try {
                // Determine accountId
                let accountId: string | undefined;
                let actualCalendarId = 'primary'; // Default for simple adds

                if (event.calendarId.startsWith('google-primary-')) {
                    // Format: google-primary-{accountId}
                    accountId = event.calendarId.replace('google-primary-', '');
                } else {
                    // Fallback using context mapping or passed props
                    accountId = (event as any).accountId;
                }

                if (!accountId) {
                    throw new Error('Could not determine account ID for Google Event');
                }

                // Dynamic import to avoid SSR/circular issues
                const { createEvent } = await import('@/lib/googleCalendar');

                // Create with "primary" because we mapped the account's primary calendar
                const { id: googleId } = await createEvent(
                    event as Partial<CalendarEvent>,
                    actualCalendarId,
                    accountId
                );

                // Update the local event with the real Google ID + Account ID composite
                const realId = `google-${accountId}-${googleId}`;

                console.log('Created Google Event:', realId);

                // Remove optimistic event
                dispatch({ type: 'DELETE_EVENT', payload: tempId });

                // Add the confirmed event (with correct ID)
                dispatch({
                    type: 'ADD_EVENT',
                    payload: {
                        ...event,
                        id: realId,
                        accountId, // Store account ID for future updates
                        category: 'synced'
                    } as any
                });

            } catch (error) {
                console.error('Failed to create Google event:', error);
                // Rollback
                dispatch({ type: 'DELETE_EVENT', payload: tempId });
                alert('Failed to sync event to Google Calendar');
            }
        }
    }, [state.calendars]);

    const updateEvent = useCallback(async (event: CalendarEvent) => {
        // Optimistic update
        dispatch({ type: 'UPDATE_EVENT', payload: event });

        if (event.id.startsWith('google-')) {
            try {
                // Parse composite ID: google-{accountId}-{googleId}
                const parts = event.id.split('-');
                let accountId, googleId;

                if (parts.length >= 3) {
                    // google-accountId-eventId
                    // accountId might remove dashes? No, firestore IDs usually don't have dashes or we validly split
                    // Limit split? 
                    // Safe way: we stored accountId in the event object when satisfying listener!
                    accountId = (event as any).accountId;
                    googleId = parts.slice(2).join('-'); // Re-join rest if ID had dashes
                } else {
                    // Legacy or simple ID: google-eventId
                    googleId = parts[1];
                    // Try to find account?! 
                    accountId = (event as any).accountId;
                }

                if (!accountId) {
                    console.warn('Missing accountId for update, defaulting to primary? Unsafe.');
                    // Attempt primary if single account? 
                }

                const actualCalendarId = event.calendarId.startsWith('google-primary-') ? 'primary' : event.calendarId;
                const { updateEvent } = await import('@/lib/googleCalendar');
                await updateEvent(googleId, event, actualCalendarId, accountId);
            } catch (error) {
                console.error('Failed to update Google event:', error);
                // Rollback? Complicated without undo stack.
                // Re-fetch?
            }
        }
    }, []);

    const deleteEvent = useCallback(async (eventId: string) => {
        // Need to find the event first to check if google
        const event = state.events.find(e => e.id === eventId);
        if (!event) return;

        // Optimistic delete
        dispatch({ type: 'DELETE_EVENT', payload: eventId });

        if (eventId.startsWith('google-')) {
            try {
                const parts = eventId.split('-');
                let accountId, googleId;
                // Use stored accountId if available on event object
                accountId = (event as any).accountId;

                if (parts.length >= 3 && accountId) {
                    // If we have accountId, we can reliably deduce googleId by removing prefix
                    // prefix is `google-${accountId}-`
                    const prefix = `google-${accountId}-`;
                    if (eventId.startsWith(prefix)) {
                        googleId = eventId.substring(prefix.length);
                    } else {
                        googleId = parts.slice(2).join('-');
                    }
                } else {
                    googleId = parts[1];
                }

                const actualCalendarId = event.calendarId.startsWith('google-primary-') ? 'primary' : event.calendarId;
                const { deleteEvent } = await import('@/lib/googleCalendar');
                await deleteEvent(googleId, actualCalendarId, accountId);
            } catch (error: any) {
                console.error('Failed to delete Google event:', error);

                // If the error is "Not Found" or 404, it means it's already deleted in Google.
                // In that case, we should NOT rollback (i.e., we accept the local delete).
                const isNotFound = error.code === 404 ||
                    error.message?.includes('Not Found') ||
                    error.toString().includes('Not Found');

                if (!isNotFound) {
                    // Only rollback if it was a real error (connection, permission, etc.)
                    dispatch({ type: 'ADD_EVENT', payload: event as any });
                } else {
                    console.warn('Event already deleted in Google Calendar, keeping local delete.');
                }
            }
        }
    }, [state.events]);

    const moveEvent = useCallback((eventId: string, newStart: Date, newEnd: Date) => {
        // Find, update dates, call updateEvent
        const event = state.events.find(e => e.id === eventId);
        if (event) {
            updateEvent({ ...event, start: newStart, end: newEnd });
        }
    }, [state.events, updateEvent]); // Use updateEvent dependency

    const openEventModal = useCallback((event?: CalendarEvent) => {
        dispatch({ type: 'OPEN_EVENT_MODAL', payload: event });
    }, []);

    const closeEventModal = useCallback(() => {
        dispatch({ type: 'CLOSE_EVENT_MODAL' });
    }, []);

    const toggleCalendarVisibility = useCallback((calendarId: string) => {
        dispatch({ type: 'TOGGLE_CALENDAR_VISIBILITY', payload: calendarId });
    }, []);

    const toggleMemberFilter = useCallback((memberId: string) => {
        dispatch({ type: 'TOGGLE_MEMBER_FILTER', payload: memberId });
    }, []);

    // Computed & Expanded Events
    const expandedEvents = React.useMemo(() => {
        // Calculate expansion range based on selected date
        // Same window as fetch (approx -1 to +2 months) to ensure smooth nav
        const startRange = new Date(state.selectedDate);
        startRange.setMonth(startRange.getMonth() - 1);
        startRange.setDate(1);

        const endRange = new Date(state.selectedDate);
        endRange.setMonth(endRange.getMonth() + 2);
        endRange.setDate(0);

        const instances: CalendarEvent[] = [];

        state.events.forEach(event => {
            // 1. If not recurring, just add it
            if (!event.rrule) {
                instances.push(event);
                return;
            }

            // 2. Expand Recurring Event (Local Master)
            try {
                // Adjust start time to be valid for RRule
                const dtstart = new Date(event.start);

                // Parse rule
                const rule = RRule.fromString(event.rrule);

                // Override dtstart in options to match event start 
                // (RRule string might not have it or might be generic)
                const options = rule.origOptions;
                options.dtstart = dtstart;
                const adjustedRule = new RRule(options);

                // Get dates in range
                const dates = adjustedRule.between(startRange, endRange, true);
                console.log(`[CalendarContext] Expanded event ${event.title} (${event.id}): ${dates.length} instances between ${startRange.toISOString()} and ${endRange.toISOString()}`);

                // Create instances
                const durationMs = event.end.getTime() - event.start.getTime();

                dates.forEach(date => {
                    const instanceStart = date;
                    const instanceEnd = new Date(date.getTime() + durationMs);

                    instances.push({
                        ...event,
                        id: `${event.id}_${date.getTime()}`, // Composite ID for instance
                        recurrenceParentId: event.id,
                        start: instanceStart,
                        end: instanceEnd,
                        // We keep the rest of the metadata
                    });
                });

            } catch (err) {
                console.error(`Failed to expand recurrence for event ${event.id}:`, err);
                // Fallback: show original
                instances.push(event);
            }
        });

        return instances;
    }, [state.events, state.selectedDate]);

    const filteredEvents = expandedEvents.filter(event => {
        // For Google events (calendarId starts with 'google-'), determine visibility
        if (event.calendarId.startsWith('google-')) {
            // Strict check: If event has assigned members, show ONLY if their personal calendar is visible
            if (event.assignedTo && event.assignedTo.length > 0) {
                return event.assignedTo.some(memberId =>
                    state.visibleCalendarIds.includes(`cal-${memberId}`)
                );
            }

            // Fallback: Only for unassigned events, show if Family calendar is visible
            if (state.visibleCalendarIds.includes('family')) {
                return true;
            }

            return false;
        } else {
            // For local events, use direct calendarId matching
            if (!state.visibleCalendarIds.includes(event.calendarId)) {
                return false;
            }
        }

        // Apply member filter if any members are selected
        if (state.selectedMemberIds.length > 0) {
            // For events with no assignments, skip member filter (show them anyway)
            if (event.assignedTo && event.assignedTo.length > 0) {
                const hasMatchingMember = event.assignedTo.some(memberId =>
                    state.selectedMemberIds.includes(memberId)
                );
                if (!hasMatchingMember) return false;
            }
        }
        return true;
    });

    const value: CalendarContextType = {
        ...state,
        dispatch,
        setView,
        setDate,
        goToToday,
        navigatePrev,
        navigateNext,
        addEvent,
        updateEvent,
        deleteEvent,
        moveEvent,
        openEventModal,
        closeEventModal,
        toggleCalendarVisibility,
        toggleMemberFilter,
        familyMembers,
        filteredEvents,
    };

    return (
        <CalendarContext.Provider value={value}>
            {children}
        </CalendarContext.Provider>
    );
}

// Hook - checks DisplayCalendarContext first, falls back to CalendarContext
// This allows calendar components to work in both authenticated and display modes
export function useCalendar() {
    const displayContext = useContext(DisplayCalendarContext);
    const calendarContext = useContext(CalendarContext);
    
    // If we're in display mode (DisplayCalendarProvider is present), use that context
    if (displayContext) {
        return displayContext as unknown as CalendarContextType;
    }
    
    // Otherwise, use the regular CalendarContext
    if (!calendarContext) {
        throw new Error('useCalendar must be used within a CalendarProvider or DisplayCalendarProvider');
    }
    return calendarContext;
}

// Export the context type for external use
export type { CalendarContextType };
