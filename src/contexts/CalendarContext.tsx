'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
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

import { useHousehold } from './HouseholdContext';
import { useAccounts } from './AccountsContext';

// Storage keys
const STORAGE_KEY = 'home-calendar-events-v2';

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
    const { familyMembers } = useHousehold();
    const { accounts } = useAccounts();

    // Keep refs for use in the Firestore listener without triggering re-effects
    const familyMembersRef = React.useRef(familyMembers);
    const accountsRef = React.useRef(accounts);
    useEffect(() => {
        familyMembersRef.current = familyMembers;
        accountsRef.current = accounts;
    }, [familyMembers, accounts]);

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

    // Load events from Google Calendar directly (Client-side Sync)
    useEffect(() => {
        let isMounted = true;

        const fetchExternalEvents = async () => {
            if (!accounts.length) return;

            // Determine date range based on view
            // For safety, fetch -1 month to +1 month from selected date
            const startRange = new Date(state.selectedDate);
            startRange.setMonth(startRange.getMonth() - 1);
            startRange.setDate(1); // Start of prev month

            const endRange = new Date(state.selectedDate);
            endRange.setMonth(endRange.getMonth() + 2);
            endRange.setDate(0); // End of next month

            try {
                const { fetchCalendarEvents } = await import('@/lib/googleCalendar');
                let allGoogleEvents: CalendarEvent[] = [];

                await Promise.all(accounts.map(async (acc) => {
                    try {
                        const events = await fetchCalendarEvents(
                            'primary',
                            startRange.toISOString(),
                            endRange.toISOString(),
                            acc.accountId
                        );

                        // Transform to app format
                        const mappedEvents = events.map(e => ({
                            ...e,
                            // Composite ID: google-{accountId}-{eventId}
                            id: `google-${acc.accountId}-${e.id}`,
                            accountId: acc.accountId,
                            calendarId: `google-primary-${acc.accountId}`,
                            category: 'synced',
                            // Ensure dates are Date objects
                            start: new Date(e.start),
                            end: new Date(e.end),
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            recurrence: 'none' as const,
                            assignedTo: acc.linkedMemberId ? [acc.linkedMemberId] : [],
                        }));
                        console.log(`[CalendarContext] Fetched ${mappedEvents.length} events for account ${acc.accountId}`);
                        allGoogleEvents.push(...mappedEvents);
                    } catch (err) {
                        console.error(`Failed to fetch events for account ${acc.accountId}:`, err);
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
                        // Filter out synced events AND any stale optimistic events for google calendars
                        !e.id.startsWith('google-') &&
                        !e.calendarId.startsWith('google-')
                    ) : [];

                    dispatch({ type: 'SET_EVENTS', payload: [...localEvents, ...allGoogleEvents] });
                }

            } catch (error) {
                console.error('Failed to fetch external events:', error);
            }
        };

        fetchExternalEvents();

        return () => {
            isMounted = false;
        };
    }, [accounts, state.selectedDate]); // Re-fetch when accounts or date changes

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

                const { updateEvent } = await import('@/lib/googleCalendar');
                await updateEvent(googleId, event, event.calendarId, accountId);
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

                const { deleteEvent } = await import('@/lib/googleCalendar');
                await deleteEvent(googleId, event.calendarId, accountId);
            } catch (error) {
                console.error('Failed to delete Google event:', error);
                // Rollback
                dispatch({ type: 'ADD_EVENT', payload: event as any });
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

// Hook
export function useCalendar() {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error('useCalendar must be used within a CalendarProvider');
    }
    return context;
}
