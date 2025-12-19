// Calendar Types and Interfaces for Premium Family Calendar

export type CalendarViewType = 'day' | 'week' | 'month' | 'agenda';

export type EventCategory =
    | 'general'
    | 'school'
    | 'medical'
    | 'sports'
    | 'music'
    | 'family'
    | 'work'
    | 'meal'
    | 'routine'
    | 'synced'; // For Google Calendar and other synced events

export const CATEGORY_ICONS: Record<EventCategory, string> = {
    general: '📌',
    school: '🏫',
    medical: '🏥',
    sports: '🏃',
    music: '🎵',
    family: '👨‍👩‍👧',
    work: '💼',
    meal: '🍽️',
    routine: '⏰',
    synced: '🔄',
};

export const CATEGORY_COLORS: Record<EventCategory, string> = {
    general: '#6366f1',
    school: '#f59e0b',
    medical: '#ef4444',
    sports: '#10b981',
    music: '#8b5cf6',
    family: '#ec4899',
    work: '#3b82f6',
    meal: '#f97316',
    routine: '#06b6d4',
    synced: '#4285F4',
};

export type RecurrencePattern =
    | 'none'
    | 'daily'
    | 'weekly'
    | 'biweekly'
    | 'monthly'
    | 'yearly';

export type FamilyRole = 'husband' | 'wife' | 'kids' | 'others';
export type Gender = 'male' | 'female' | 'other';
export type CalendarType = 'personal' | 'family' | 'work' | 'other';
export type CalendarSource = 'local' | 'google' | 'apple' | 'outlook' | 'caldav';

// Connected calendar account reference for a family member
export interface ConnectedAccountRef {
    provider: CalendarSource;
    email: string;
    displayName?: string;
    accountId?: string; // Reference to the actual account if stored separately
}

export interface FamilyMember {
    id: string;
    name: string;
    avatar?: string; // URL or emoji
    color: string;
    role: FamilyRole;
    gender?: Gender;
    dateOfBirth?: Date;
    phoneNumber?: string;
    email?: string;
    connectedAccounts?: ConnectedAccountRef[]; // Linked calendar accounts
}

export interface Calendar {
    id: string;
    name: string;
    color: string;
    isVisible: boolean;
    isDefault?: boolean;
    ownerId?: string; // Family member who owns this calendar
    type: CalendarType;
    source: CalendarSource;
    isFamilyShared?: boolean; // If true, events are visible to authorized family members
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    location?: string;

    // Time
    start: Date;
    end: Date;
    isAllDay: boolean;

    // Organization
    calendarId: string;
    category: EventCategory;
    color?: string; // Override calendar color

    // Recurrence
    recurrence: RecurrencePattern;
    recurrenceEndDate?: Date;
    recurrenceParentId?: string; // For recurring event instances

    // Assignment
    assignedTo: string[]; // Family member IDs

    // Metadata
    createdAt: Date;
    updatedAt: Date;

    // Meal planning specific
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface CalendarState {
    // View state
    currentView: CalendarViewType;
    selectedDate: Date;

    // Data
    events: CalendarEvent[];
    calendars: Calendar[];
    familyMembers: FamilyMember[];

    // Filters
    visibleCalendarIds: string[];
    selectedMemberIds: string[];

    // UI state
    isEventModalOpen: boolean;
    editingEvent: CalendarEvent | null;
    isLoading: boolean;
}

export type CalendarAction =
    | { type: 'SET_VIEW'; payload: CalendarViewType }
    | { type: 'SET_DATE'; payload: Date }
    | { type: 'GO_TO_TODAY' }
    | { type: 'NAVIGATE_PREV' }
    | { type: 'NAVIGATE_NEXT' }
    | { type: 'ADD_EVENT'; payload: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> }
    | { type: 'UPDATE_EVENT'; payload: CalendarEvent }
    | { type: 'DELETE_EVENT'; payload: string }
    | { type: 'MOVE_EVENT'; payload: { eventId: string; newStart: Date; newEnd: Date } }
    | { type: 'TOGGLE_CALENDAR_VISIBILITY'; payload: string }
    | { type: 'TOGGLE_MEMBER_FILTER'; payload: string }
    | { type: 'OPEN_EVENT_MODAL'; payload?: CalendarEvent }
    | { type: 'CLOSE_EVENT_MODAL' }
    | { type: 'SET_EVENTS'; payload: CalendarEvent[] }
    | { type: 'SET_CALENDARS'; payload: Calendar[] }
    | { type: 'SET_FAMILY_MEMBERS'; payload: FamilyMember[] }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'ADD_MEMBER'; payload: FamilyMember }
    | { type: 'UPDATE_MEMBER'; payload: FamilyMember }
    | { type: 'DELETE_MEMBER'; payload: string };

// Default calendars for demo
export const DEFAULT_CALENDARS: Calendar[] = [
    {
        id: 'family',
        name: 'Family',
        color: '#ec4899',
        isVisible: true,
        isDefault: true,
        type: 'family',
        source: 'local',
        isFamilyShared: true
    },
    // Personal calendars will be generated per user, but keeping these for initial generic structure if needed
    // or we can remove them and rely on the new logic. 
    // For now, let's update them to match the type but keep them generic till logic is in place.
    { id: 'work', name: 'Work', color: '#3b82f6', isVisible: true, type: 'work', source: 'local' },
    { id: 'school', name: 'School', color: '#f59e0b', isVisible: true, type: 'personal', source: 'local' }, // Assuming 'school' is a personal type for now
];

// Default family members for demo
export const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
    {
        id: 'parent1',
        name: 'Husband',
        avatar: '👨',
        color: '#3b82f6',
        role: 'husband',
        gender: 'male',
        connectedAccounts: [],
    },
    {
        id: 'parent2',
        name: 'Wife',
        avatar: '👩',
        color: '#ec4899',
        role: 'wife',
        gender: 'female',
        connectedAccounts: [],
    },
    {
        id: 'child1',
        name: 'Kid 1',
        avatar: '👦',
        color: '#10b981',
        role: 'kids',
        gender: 'male',
        connectedAccounts: [],
    },
];

// Helper functions
export function getEventDuration(event: CalendarEvent): number {
    return event.end.getTime() - event.start.getTime();
}

export function isEventOnDate(event: CalendarEvent, date: Date): boolean {
    const eventDate = new Date(event.start);
    return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
    );
}

export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
    return events.filter(event => isEventOnDate(event, date));
}

export function getEventsInRange(events: CalendarEvent[], start: Date, end: Date): CalendarEvent[] {
    return events.filter(event => {
        const eventStart = new Date(event.start);
        return eventStart >= start && eventStart <= end;
    });
}

export function sortEventsByTime(events: CalendarEvent[]): CalendarEvent[] {
    return [...events].sort((a, b) => {
        // All-day events first
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        // Then by start time
        return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
}
