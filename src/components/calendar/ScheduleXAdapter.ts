/**
 * ScheduleXAdapter.ts
 * 
 * Adapter utilities for converting between the app's CalendarEvent format
 * and Schedule-X's event format.
 */

import { CalendarEvent, FamilyMember, CATEGORY_COLORS } from '@/types/calendar';

/**
 * Schedule-X event format interface (matches Schedule-X CalendarEventExternal)
 */
export interface ScheduleXEvent {
    id: string;
    title: string;
    start: string; // ISO date string (YYYY-MM-DD HH:mm)
    end: string;   // ISO date string (YYYY-MM-DD HH:mm)
    calendarId?: string;
    location?: string;
    description?: string;
    people?: string[];  // Use this to store assigned member IDs
}

/**
 * Custom event metadata (stored separately to avoid type conflicts)
 */
export interface EventMetadata {
    assignedTo: string[];
    category: string;
    isAllDay: boolean;
    color?: string;
    originalEvent: CalendarEvent;
}

/**
 * Map to store custom event metadata by event ID
 */
export const eventMetadataMap = new Map<string, EventMetadata>();

/**
 * Schedule-X calendar definition
 */
export interface ScheduleXCalendarConfig {
    colorName: string;
    lightColors?: {
        main: string;
        container: string;
        onContainer: string;
    };
    darkColors?: {
        main: string;
        container: string;
        onContainer: string;
    };
}

/**
 * Format a Date to Schedule-X compatible string (YYYY-MM-DD HH:mm)
 */
function formatDateForScheduleX(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Parse Schedule-X date string back to Date object
 */
export function parseDateFromScheduleX(dateStr: string): Date {
    // Format: YYYY-MM-DD HH:mm
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Convert a CalendarEvent to Schedule-X format
 */
export function toScheduleXEvent(event: CalendarEvent, familyMembers: FamilyMember[]): ScheduleXEvent {
    // Determine the calendar ID based on assigned members
    // If event has assigned members, use the first one's calendar
    let calendarId = 'family';
    if (event.assignedTo && event.assignedTo.length > 0) {
        calendarId = event.assignedTo[0];
    }

    // Determine color - prioritize event color, then member color, then category
    let color = event.color;
    if (!color && event.assignedTo && event.assignedTo.length > 0) {
        const member = familyMembers.find(m => m.id === event.assignedTo[0]);
        if (member) {
            color = member.color;
        }
    }
    if (!color) {
        color = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.general;
    }

    // Store metadata in the map
    eventMetadataMap.set(event.id, {
        assignedTo: event.assignedTo || [],
        category: event.category,
        isAllDay: event.isAllDay,
        color,
        originalEvent: event,
    });

    return {
        id: event.id,
        title: event.title,
        start: formatDateForScheduleX(event.start),
        end: formatDateForScheduleX(event.end),
        calendarId,
        location: event.location,
        description: event.description,
        people: event.assignedTo || [], // Store member IDs as people
    };
}

/**
 * Convert a Schedule-X event back to CalendarEvent format
 */
export function fromScheduleXEvent(sxEvent: ScheduleXEvent): Partial<CalendarEvent> {
    const start = parseDateFromScheduleX(sxEvent.start);
    const end = parseDateFromScheduleX(sxEvent.end);
    
    // Check if we have stored metadata
    const metadata = eventMetadataMap.get(sxEvent.id);
    
    if (metadata?.originalEvent) {
        return {
            ...metadata.originalEvent,
            id: sxEvent.id,
            title: sxEvent.title,
            start,
            end,
            location: sxEvent.location,
            description: sxEvent.description,
        };
    }

    return {
        id: sxEvent.id,
        title: sxEvent.title,
        start,
        end,
        location: sxEvent.location,
        description: sxEvent.description,
        assignedTo: sxEvent.people || [],
        isAllDay: metadata?.isAllDay || false,
    };
}

/**
 * Get event metadata by ID
 */
export function getEventMetadata(eventId: string): EventMetadata | undefined {
    return eventMetadataMap.get(eventId);
}

/**
 * Clear all event metadata (useful when events are refreshed)
 */
export function clearEventMetadata(): void {
    eventMetadataMap.clear();
}

/**
 * Convert multiple CalendarEvents to Schedule-X format
 */
export function toScheduleXEvents(
    events: CalendarEvent[],
    familyMembers: FamilyMember[]
): ScheduleXEvent[] {
    // Clear old metadata before conversion
    clearEventMetadata();
    return events.map(event => toScheduleXEvent(event, familyMembers));
}

/**
 * Generate Schedule-X calendar configurations from family members
 */
export function generateCalendarConfigs(
    familyMembers: FamilyMember[]
): Record<string, ScheduleXCalendarConfig> {
    const configs: Record<string, ScheduleXCalendarConfig> = {
        // Default family calendar
        family: {
            colorName: 'family',
            lightColors: {
                main: '#ec4899',
                container: '#fce7f3',
                onContainer: '#831843',
            },
            darkColors: {
                main: '#f472b6',
                container: '#4a1a35',
                onContainer: '#fce7f3',
            },
        },
    };

    // Add calendar for each family member
    familyMembers.forEach(member => {
        configs[member.id] = {
            colorName: member.id,
            lightColors: {
                main: member.color,
                container: hexToLighter(member.color),
                onContainer: hexToDarker(member.color),
            },
            darkColors: {
                main: member.color,
                container: hexToDarker(member.color),
                onContainer: hexToLighter(member.color),
            },
        };
    });

    return configs;
}

/**
 * Helper: Convert hex color to a lighter shade
 */
function hexToLighter(hex: string): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Lighten by mixing with white (0.8 original, 0.2 white)
    const factor = 0.75;
    const newR = Math.round(r * factor + 255 * (1 - factor));
    const newG = Math.round(g * factor + 255 * (1 - factor));
    const newB = Math.round(b * factor + 255 * (1 - factor));
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Helper: Convert hex color to a darker shade
 */
function hexToDarker(hex: string): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Darken by reducing each component
    const factor = 0.4;
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Get member initials for avatar display
 */
export function getMemberInitials(member: FamilyMember): string {
    const names = member.name.split(' ');
    if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return member.name.substring(0, 2).toUpperCase();
}

/**
 * Get members assigned to an event
 */
export function getEventMembers(
    event: CalendarEvent | ScheduleXEvent,
    familyMembers: FamilyMember[]
): FamilyMember[] {
    let assignedIds: string[] = [];
    
    if ('assignedTo' in event && Array.isArray(event.assignedTo)) {
        assignedIds = event.assignedTo;
    } else if ('people' in event && Array.isArray(event.people)) {
        assignedIds = event.people;
    } else if ('id' in event) {
        const metadata = eventMetadataMap.get(event.id);
        if (metadata) {
            assignedIds = metadata.assignedTo;
        }
    }
    
    return familyMembers.filter(member => assignedIds.includes(member.id));
}
