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

        case 'SET_CALENDARS':
            return { ...state, calendars: action.payload };

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
                const events = parsed.map((e: any) => ({
                    ...e,
                    start: new Date(e.start),
                    end: new Date(e.end),
                    createdAt: new Date(e.createdAt),
                    updatedAt: new Date(e.updatedAt),
                }));
                dispatch({ type: 'SET_EVENTS', payload: events });
            }
        } catch (error) {
            console.error('Failed to load calendar events:', error);
        }
        dispatch({ type: 'SET_LOADING', payload: false });
    }, []);

    // Listen to Firestore cached events from Google Calendar
    useEffect(() => {
        // Dynamic import to avoid SSR issues
        const setupFirestoreListener = async () => {
            try {
                const { auth } = await import('@/lib/firebase');
                const { onAuthStateChanged } = await import('firebase/auth');
                const { doc, onSnapshot, getFirestore } = await import('firebase/firestore');

                const unsubAuth = onAuthStateChanged(auth, (user) => {
                    if (!user) return;

                    const db = getFirestore();
                    const unsubFirestore = onSnapshot(
                        doc(db, 'cachedEvents', user.uid),
                        (docSnap) => {
                            if (docSnap.exists()) {
                                const data = docSnap.data();
                                const currentMembers = familyMembersRef.current;
                                const currentAccounts = accountsRef.current;

                                // Helper to find event owner based on accountId from synced event
                                const findOwnerId = (eventData: any): string[] => {
                                    // First try: Match by accountId (most accurate)
                                    if (eventData.accountId) {
                                        const account = currentAccounts.find(acc => acc.accountId === eventData.accountId);
                                        if (account?.linkedMemberId) {
                                            return [account.linkedMemberId];
                                        }
                                        // Fallback: check member's connectedAccounts
                                        const memberByAccountId = currentMembers.find(m =>
                                            m.connectedAccounts?.some(acc => acc.accountId === eventData.accountId)
                                        );
                                        if (memberByAccountId) {
                                            return [memberByAccountId.id];
                                        }
                                    }

                                    // Second try: Match by calendar email if available
                                    const owner = currentMembers.find(m =>
                                        m.connectedAccounts?.some(acc =>
                                            acc.provider === 'google' && acc.email === user.email
                                        )
                                    );
                                    return owner ? [owner.id] : [];
                                };

                                const googleEvents: CalendarEvent[] = (data.events || []).map((e: any) => ({
                                    id: `google-${e.id}`,
                                    title: e.title,
                                    description: e.description || '',
                                    start: new Date(e.start),
                                    end: new Date(e.end),
                                    isAllDay: e.isAllDay || false,
                                    calendarId: 'google',
                                    category: 'synced' as const,
                                    color: e.calendarColor || '#4285F4',
                                    recurrence: 'none' as const,
                                    assignedTo: findOwnerId(e), // Map to member
                                    location: e.location,
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                    mealType: undefined, // Explicitly undefined for synced events to match type
                                }));

                                // Get current localStorage events and merge
                                const stored = localStorage.getItem(STORAGE_KEY);
                                const localEvents = stored ? JSON.parse(stored).map((e: any) => ({
                                    ...e,
                                    start: new Date(e.start),
                                    end: new Date(e.end),
                                    createdAt: new Date(e.createdAt),
                                    updatedAt: new Date(e.updatedAt),
                                })) : [];

                                // Filter out unknown props from local events if needed, but TypeScript handles it.
                                // Filter out any existing google events from local state just in case
                                const nonGoogleEvents = localEvents.filter((e: CalendarEvent) => !e.id.startsWith('google-'));
                                const mergedEvents = [...nonGoogleEvents, ...googleEvents];

                                dispatch({ type: 'SET_EVENTS', payload: mergedEvents });
                                console.log('Loaded Google Calendar events:', googleEvents.length);
                            }
                        },
                        (error) => {
                            console.error('Error listening to cached events:', error);
                        }
                    );

                    return () => unsubFirestore();
                });

                return () => unsubAuth();
            } catch (error) {
                console.error('Failed to setup Firestore listener:', error);
            }
        };

        setupFirestoreListener();
    }, []); // Empty dependency array - using ref for fresh members

    // Save events to localStorage on change
    useEffect(() => {
        if (!state.isLoading) {
            // Only save non-Google events to localStorage
            const localEvents = state.events.filter(e => !e.id.startsWith('google-'));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localEvents));
        }
    }, [state.events, state.isLoading]);

    // Sync members and auto-generate calendars
    useEffect(() => {
        // Generate personal calendars for members
        const memberCalendars: Calendar[] = familyMembers.map((m: FamilyMember) => {
            // Check if we already have a calendar for this member that might have custom settings?
            // For now, simple regeneration or merge
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

        // Merge with default family calendar and preserve visibility state if possible
        // Ideally we wouldn't overwrite 'calendars' completely if we want to store visibility in 'calendars' array
        // But 'visibleCalendarIds' handles visibility.
        // So we just need to ensure we don't duplicate.

        const familyCal = DEFAULT_CALENDARS.find(c => c.type === 'family')!;
        const newCalendars = [familyCal, ...memberCalendars];

        // We only dispatch if calendars have changed length or content to avoid loops, 
        // but for now let's just dispatch. 
        // OPTIMIZATION: Compare with current state.calendars
        const currentCalIds = state.calendars.map(c => c.id).sort().join(',');
        const newCalIds = newCalendars.map(c => c.id).sort().join(',');

        if (currentCalIds !== newCalIds || state.calendars.length !== newCalendars.length) {
            dispatch({ type: 'SET_CALENDARS', payload: newCalendars });
        }

    }, [familyMembers]);

    // Convenience action handlers
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
        // Optimistically add to local state
        const tempId = crypto.randomUUID();
        dispatch({
            type: 'ADD_EVENT',
            payload: { ...event, id: tempId } as any // Type assertion needed here as reducer expects full event minus stamps
        });

        // If it's a Google Calendar event, try to create it in the backend
        if (event.calendarId === 'google' || event.calendarId.startsWith('google-')) {
            try {
                // Dynamic import to avoid SSR/circular issues
                const { createEvent } = await import('@/lib/googleCalendar');
                const { id: googleId } = await createEvent(event as Partial<CalendarEvent>, event.calendarId === 'google' ? 'primary' : event.calendarId);

                // Update the local event with the real Google ID
                // Note: You might want a REPLACE_EVENT action or similar, 
                // but for now the sync listener will eventually catch it.
                console.log('Created Google Event:', googleId);
            } catch (error) {
                console.error('Failed to create Google event:', error);
                // Optionally revert state here or show toast
            }
        }
    }, []);

    const updateEvent = useCallback((event: CalendarEvent) => {
        dispatch({ type: 'UPDATE_EVENT', payload: event });
    }, []);

    const deleteEvent = useCallback((eventId: string) => {
        dispatch({ type: 'DELETE_EVENT', payload: eventId });
    }, []);

    const moveEvent = useCallback((eventId: string, newStart: Date, newEnd: Date) => {
        dispatch({ type: 'MOVE_EVENT', payload: { eventId, newStart, newEnd } });
    }, []);

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

    // Member management proxies (deprecated, use HouseholdContext directly)
    // We keep them for now if interfaces demand it, or better, remove them from context type
    // and let consumers switch to useHousehold()
    // But since the interface defines them, we must provide implementations or change the interface.
    // Changing the interface is cleaner.
    // For this refactor, I will modify the Context Interface to remove them.

    // Computed: filtered events based on visible calendars and selected members
    const filteredEvents = state.events.filter(event => {
        // Filter by visible calendars
        if (!state.visibleCalendarIds.includes(event.calendarId)) {
            return false;
        }
        // Filter by selected members (if any selected)
        if (state.selectedMemberIds.length > 0) {
            const hasMatchingMember = event.assignedTo.some(memberId =>
                state.selectedMemberIds.includes(memberId)
            );
            if (!hasMatchingMember) return false;
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
        familyMembers, // Pass through from HouseholdContext
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
