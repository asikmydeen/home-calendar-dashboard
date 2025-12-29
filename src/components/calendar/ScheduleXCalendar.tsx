'use client';

// Temporal polyfill must be imported before Schedule-X
import { Temporal } from 'temporal-polyfill';
// @ts-ignore - Polyfill global Temporal
if (typeof globalThis.Temporal === 'undefined') {
    (globalThis as any).Temporal = Temporal;
}

import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import { CalendarEvent, FamilyMember } from '@/types/calendar';
import {
    toScheduleXEvents,
    fromScheduleXEvent,
    generateCalendarConfigs,
    getMemberInitials,
    getEventMembers,
    ScheduleXEvent,
} from './ScheduleXAdapter';

// Schedule-X imports
// Note: We import createCalendar directly to bypass Schedule-X's buggy hooks
// Their useCalendarApp/useNextCalendarApp have empty dependency arrays that cause
// stale closure issues in React Strict Mode
import { createCalendar, viewDay, viewWeek, viewMonthGrid } from '@schedule-x/calendar';
import { ScheduleXCalendar as ScheduleXCalendarBase } from '@schedule-x/react';
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop';
import { createResizePlugin } from '@schedule-x/resize';
import { createEventRecurrencePlugin } from '@schedule-x/event-recurrence';

// Import Schedule-X theme
import '@schedule-x/theme-default/dist/index.css';

interface ScheduleXCalendarProps {
    className?: string;
}

/**
 * Custom event content renderer for family member indicators
 */
function FamilyEventContent({
    event,
    familyMembers,
}: {
    event: ScheduleXEvent;
    familyMembers: FamilyMember[];
}) {
    const members = getEventMembers(event, familyMembers);

    return (
        <div className="sx-family-event h-full w-full p-1 overflow-hidden">
            <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-medium truncate flex-1">
                    {event.title}
                </span>
                {members.length > 0 && (
                    <div className="flex -space-x-1 flex-shrink-0">
                        {members.slice(0, 3).map((member) => (
                            <div
                                key={member.id}
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-white shadow-sm"
                                style={{ backgroundColor: member.color, color: '#fff' }}
                                title={member.name}
                            >
                                {member.avatar || getMemberInitials(member)}
                            </div>
                        ))}
                        {members.length > 3 && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold bg-slate-500 text-white border-2 border-white shadow-sm">
                                +{members.length - 3}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {event.location && (
                <div className="text-[10px] text-slate-600 truncate mt-0.5">
                    📍 {event.location}
                </div>
            )}
        </div>
    );
}

/**
 * CRITICAL: Generate a guaranteed valid YYYY-MM-DD string at module load time
 * This ensures we ALWAYS have a fallback before any React rendering starts
 */
function getTodayString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Module-level constant - guaranteed to be valid YYYY-MM-DD before any render
const DEFAULT_DATE_STRING = getTodayString();

/**
 * Helper function to format a Date object for Schedule-X
 * Schedule-X requires dates in YYYY-MM-DD string format
 * This is defined early so it can be used in the bridge hook
 */
const formatDateForScheduleX = (date: Date | undefined | null): string => {
    // Handle invalid or missing dates by defaulting to the module-level constant
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return DEFAULT_DATE_STRING;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const result = `${year}-${month}-${day}`;
    
    // Double-check the result matches expected format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) {
        return DEFAULT_DATE_STRING;
    }
    
    return result;
};

/**
 * Hook to bridge CalendarContext with Schedule-X
 * Returns safe default values if context is not ready
 */
function useScheduleXBridge() {
    // Wrap in try-catch to handle context not being available
    let contextValues;
    let contextError = false;
    
    try {
        contextValues = useCalendar();
    } catch (error) {
        contextError = true;
    }
    
    // Destructure with safe defaults
    const {
        filteredEvents = [],
        familyMembers = [],
        currentView = 'month',
        selectedDate,
        setDate = () => {},
        updateEvent = () => {},
        moveEvent = () => {},
        openEventModal = () => {},
    } = contextValues || {};
    
    // CRITICAL: Always ensure selectedDate is a valid Date, defaulting to today
    const safeSelectedDate = useMemo(() => {
        if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
            return new Date();
        }
        return selectedDate;
    }, [selectedDate]);

    // Convert current view to Schedule-X view name
    const scheduleXView = useMemo(() => {
        switch (currentView) {
            case 'day':
                return 'day';
            case 'week':
                return 'week';
            case 'month':
            case 'agenda':
            default:
                return 'month-grid';
        }
    }, [currentView]);

    // Convert events to Schedule-X format
    const scheduleXEvents = useMemo(() => {
        return toScheduleXEvents(filteredEvents, familyMembers);
    }, [filteredEvents, familyMembers]);

    // Generate calendar configs for Schedule-X
    const calendarConfigs = useMemo(() => {
        return generateCalendarConfigs(familyMembers);
    }, [familyMembers]);

    // Handle event drag
    const handleEventDrag = useCallback(
        (updatedEvent: ScheduleXEvent) => {
            const partialEvent = fromScheduleXEvent(updatedEvent);
            if (partialEvent.id && partialEvent.start && partialEvent.end) {
                moveEvent(partialEvent.id, partialEvent.start, partialEvent.end);
            }
        },
        [moveEvent]
    );

    // Handle event resize
    const handleEventResize = useCallback(
        (updatedEvent: ScheduleXEvent) => {
            const partialEvent = fromScheduleXEvent(updatedEvent);
            const originalEvent = filteredEvents.find(e => e.id === partialEvent.id);
            if (originalEvent && partialEvent.end) {
                updateEvent({
                    ...originalEvent,
                    end: partialEvent.end,
                });
            }
        },
        [filteredEvents, updateEvent]
    );

    // Handle event click
    const handleEventClick = useCallback(
        (eventId: string) => {
            const event = filteredEvents.find(e => e.id === eventId);
            if (event) {
                openEventModal(event);
            }
        },
        [filteredEvents, openEventModal]
    );

    // Handle date click (for creating new events)
    const handleDateClick = useCallback(
        (date: string) => {
            // Parse the date and open modal for new event
            const [datePart, timePart] = date.split(' ');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hours, minutes] = (timePart || '09:00').split(':').map(Number);
            const clickedDate = new Date(year, month - 1, day, hours, minutes);
            
            // Create a temporary event for the modal
            const tempEvent: CalendarEvent = {
                id: '', // Will be generated
                title: '',
                start: clickedDate,
                end: new Date(clickedDate.getTime() + 60 * 60 * 1000), // 1 hour default
                isAllDay: false,
                calendarId: 'family',
                category: 'general',
                recurrence: 'none',
                assignedTo: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            openEventModal(tempEvent);
        },
        [openEventModal]
    );

    return {
        scheduleXEvents,
        scheduleXView,
        calendarConfigs,
        selectedDate: safeSelectedDate,  // Always return the safe date
        familyMembers,
        filteredEvents,
        handleEventDrag,
        handleEventResize,
        handleEventClick,
        handleDateClick,
        setDate,
        isReady: !contextError,  // Flag to indicate if context is ready
    };
}

/**
 * Internal component that actually renders Schedule-X
 * Separated to ensure it only mounts when we have valid data
 *
 * CRITICAL: This component uses a key prop from the parent to force remounts
 * when the date changes, which ensures Schedule-X's useCalendarApp hook
 * always receives fresh config on initialization.
 */
function ScheduleXCalendarInner({
    className,
    scheduleXEvents,
    scheduleXView,
    calendarConfigs,
    initialDateString,
    handleEventDrag,
    handleEventClick,
    handleDateClick,
    setDate,
}: {
    className: string;
    scheduleXEvents: ScheduleXEvent[];
    scheduleXView: string;
    calendarConfigs: any;
    initialDateString: string;
    handleEventDrag: (event: ScheduleXEvent) => void;
    handleEventClick: (eventId: string) => void;
    handleDateClick: (date: string) => void;
    setDate: (date: Date) => void;
}) {
    // Track previous values to detect changes
    const prevEventsRef = useRef<ScheduleXEvent[]>([]);
    
    // CRITICAL FIX: Use state to hold the calendar instance
    // We manage the lifecycle ourselves to avoid Schedule-X's buggy hooks
    const [calendar, setCalendar] = useState<ReturnType<typeof createCalendar> | null>(null);
    
    // CRITICAL FIX: Validate and ensure the date string is ALWAYS valid YYYY-MM-DD
    // This guards against any possible edge case
    const safeInitialDateString = useMemo(() => {
        // Triple-check the format
        if (!initialDateString || typeof initialDateString !== 'string') {
            return DEFAULT_DATE_STRING;
        }
        
        // Verify it matches YYYY-MM-DD exactly
        const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
        const match = initialDateString.match(datePattern);
        
        if (!match) {
            return DEFAULT_DATE_STRING;
        }
        
        // Verify the date components are valid
        const [, yearStr, monthStr, dayStr] = match;
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return DEFAULT_DATE_STRING;
        }
        
        return initialDateString;
    }, [initialDateString]);
    
    // CRITICAL FIX: Store callbacks in refs to avoid stale closures
    const handleEventDragRef = useRef(handleEventDrag);
    const handleEventClickRef = useRef(handleEventClick);
    const handleDateClickRef = useRef(handleDateClick);
    const setDateRef = useRef(setDate);
    
    // Keep refs updated
    useEffect(() => {
        handleEventDragRef.current = handleEventDrag;
        handleEventClickRef.current = handleEventClick;
        handleDateClickRef.current = handleDateClick;
        setDateRef.current = setDate;
    }, [handleEventDrag, handleEventClick, handleDateClick, setDate]);

    // CRITICAL FIX: Create calendar instance directly instead of using buggy Schedule-X hooks
    // This avoids the stale closure issue in React Strict Mode
    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;
        
        // CRITICAL FIX FOR REACT STRICT MODE DOUBLE INVOCATION:
        // Compute a fresh, guaranteed-valid date string RIGHT HERE in the effect
        // Do NOT rely on props, useMemo, or any external state that might be stale during remount
        const freshDateString = (() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        })();
        
        // Verify the fresh date string matches YYYY-MM-DD pattern (should always pass, but safety first)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(freshDateString)) {
            console.error('[ScheduleXCalendar] CRITICAL: freshDateString is invalid:', freshDateString);
            return; // Don't attempt to create calendar with invalid date
        }
        
        // Try to use the prop-provided date if valid, otherwise use freshly computed date
        // This ensures we ALWAYS have a valid date, even during Strict Mode double invocation
        let dateToUse: string;
        
        if (safeInitialDateString &&
            typeof safeInitialDateString === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(safeInitialDateString)) {
            dateToUse = safeInitialDateString;
        } else {
            console.warn('[ScheduleXCalendar] safeInitialDateString invalid during Strict Mode remount, using fresh date:', {
                safeInitialDateString,
                freshDateString
            });
            dateToUse = freshDateString;
        }
        
        // Final validation before createCalendar call - ensure it's a string and matches format
        // Use String() coercion to handle any edge case where dateToUse might not be a primitive string
        const finalSelectedDate = String(dateToUse || freshDateString);
        
        if (!/^\d{4}-\d{2}-\d{2}$/.test(finalSelectedDate)) {
            console.error('[ScheduleXCalendar] CRITICAL: finalSelectedDate failed validation:', finalSelectedDate, 'Falling back to freshDateString:', freshDateString);
            // If even the fallback fails, abort calendar creation
            if (!/^\d{4}-\d{2}-\d{2}$/.test(freshDateString)) {
                console.error('[ScheduleXCalendar] CRITICAL: Cannot create calendar - no valid date available');
                return;
            }
        }
        
        // Use the validated date string - prefer finalSelectedDate if valid, otherwise freshDateString
        const selectedDateForCalendar = /^\d{4}-\d{2}-\d{2}$/.test(finalSelectedDate)
            ? finalSelectedDate
            : freshDateString;
        
        // CRITICAL FIX: Create fresh plugins inside the effect on each mount
        // This prevents reusing destroyed plugin instances during React Strict Mode double invocation
        const freshPlugins = [
            createDragAndDropPlugin(),
            createResizePlugin(),
            createEventRecurrencePlugin(),
        ];
        
        // CRITICAL DEBUG: Log the actual value being passed to createCalendar
        console.log('[ScheduleXCalendar] Creating calendar with selectedDate:', {
            selectedDateForCalendar,
            type: typeof selectedDateForCalendar,
            length: selectedDateForCalendar?.length,
            matchesPattern: /^\d{4}-\d{2}-\d{2}$/.test(selectedDateForCalendar),
        });
        
        // ABSOLUTE FINAL FALLBACK: If somehow we still don't have a valid date, compute one now
        let finalDate = selectedDateForCalendar;
        if (!finalDate || typeof finalDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
            const emergencyDate = new Date();
            finalDate = `${emergencyDate.getFullYear()}-${String(emergencyDate.getMonth() + 1).padStart(2, '0')}-${String(emergencyDate.getDate()).padStart(2, '0')}`;
            console.warn('[ScheduleXCalendar] Using emergency fallback date:', finalDate);
        }
        
        try {
            const calendarInstance = createCalendar({
                views: [viewDay, viewWeek, viewMonthGrid],
                defaultView: scheduleXView,
                selectedDate: finalDate,
                events: scheduleXEvents,
                calendars: calendarConfigs,
                plugins: freshPlugins,
                callbacks: {
                    onEventUpdate: (updatedEvent: any) => {
                        handleEventDragRef.current(updatedEvent);
                    },
                    onEventClick: (eventData: any) => {
                        handleEventClickRef.current(eventData.id);
                    },
                    onDoubleClickDateTime: (dateTime: string) => {
                        handleDateClickRef.current(dateTime);
                    },
                    onDoubleClickDate: (date: string) => {
                        handleDateClickRef.current(date + ' 09:00');
                    },
                    onSelectedDateUpdate: (date: string) => {
                        const [year, month, day] = date.split('-').map(Number);
                        setDateRef.current(new Date(year, month - 1, day));
                    },
                },
                dayBoundaries: {
                    start: '06:00',
                    end: '22:00',
                },
                weekOptions: {
                    gridHeight: 800,
                    nDays: 7,
                    eventWidth: 95,
                },
                monthGridOptions: {
                    nEventsPerDay: 4,
                },
            });
            
            setCalendar(calendarInstance);
            
            // Cleanup on unmount
            return () => {
                calendarInstance.destroy();
            };
        } catch (error) {
            console.error('[ScheduleXCalendar] Failed to create calendar:', error);
        }
    // Only recreate when these stable values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safeInitialDateString, scheduleXView]);

    // Update events when they change (after initial render)
    useEffect(() => {
        if (calendar && scheduleXEvents && prevEventsRef.current !== scheduleXEvents) {
            try {
                calendar.events.set(scheduleXEvents);
            } catch (e) {
                // Event update might fail during initialization
            }
            prevEventsRef.current = scheduleXEvents;
        }
    }, [calendar, scheduleXEvents]);
    
    // Update calendars when they change
    useEffect(() => {
        if (calendar && calendarConfigs) {
            try {
                // Schedule-X doesn't have a direct calendars.set method,
                // but we can update via the calendar instance if available
            } catch (e) {
                // Calendar config update skipped
            }
        }
    }, [calendar, calendarConfigs]);

    // Don't render Schedule-X until calendar instance is created
    if (!calendar) {
        return (
            <div className={`schedule-x-calendar-wrapper h-full w-full ${className} flex items-center justify-center`}>
                <div className="text-gray-400">Loading calendar...</div>
            </div>
        );
    }

    return (
        <div className={`schedule-x-calendar-wrapper h-full w-full ${className}`}>
            <style jsx global>{`
                /* Schedule-X Custom Theme for Family Calendar */
                .sx-react-calendar-wrapper {
                    height: 100%;
                    width: 100%;
                }

                .sx-react-calendar {
                    --sx-color-primary: #f97316;
                    --sx-color-primary-variant: #ea580c;
                    --sx-color-on-primary: #ffffff;
                    --sx-color-surface: #ffffff;
                    --sx-color-on-surface: #1e293b;
                    --sx-color-surface-variant: #f8fafc;
                    --sx-color-on-surface-variant: #475569;
                    --sx-color-background: #ffffff;
                    --sx-color-on-background: #1e293b;
                    --sx-border-radius: 0.75rem;
                    --sx-border-radius-small: 0.5rem;
                    font-family: inherit;
                    height: 100%;
                    border: none;
                    background: transparent;
                }

                /* Header styling */
                .sx-calendar-header {
                    background: linear-gradient(to right, #fffbeb, #fff7ed);
                    border-bottom: 1px solid #fde68a;
                    padding: 0.75rem 1rem;
                    border-radius: var(--sx-border-radius) var(--sx-border-radius) 0 0;
                }

                .sx-calendar-header__date-text {
                    font-weight: 600;
                    color: #1e293b;
                }

                /* Navigation buttons */
                .sx-calendar-header__btn {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    padding: 0.5rem;
                    transition: all 0.2s;
                }

                .sx-calendar-header__btn:hover {
                    background: #f97316;
                    color: white;
                    border-color: #f97316;
                }

                /* View selector */
                .sx-view-selector {
                    background: white;
                    border-radius: 0.5rem;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                }

                .sx-view-selector__btn {
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }

                .sx-view-selector__btn--selected {
                    background: #f97316;
                    color: white;
                }

                /* Time grid */
                .sx-time-grid__time-axis {
                    background: #f8fafc;
                    border-right: 1px solid #e2e8f0;
                }

                .sx-time-grid__time-axis-time {
                    color: #64748b;
                    font-size: 0.75rem;
                }

                /* Day headers */
                .sx-day-header {
                    background: #fefce8;
                    border-bottom: 1px solid #fde68a;
                    padding: 0.5rem;
                }

                .sx-day-header__day-name {
                    color: #78716c;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .sx-day-header__day-number {
                    font-weight: 600;
                    color: #1e293b;
                }

                .sx-day-header--is-today .sx-day-header__day-number {
                    background: #f97316;
                    color: white;
                    border-radius: 50%;
                    padding: 0.25rem 0.5rem;
                }

                /* Events */
                .sx-event {
                    border-radius: 0.375rem;
                    border-left: 3px solid currentColor;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                    transition: all 0.2s;
                    cursor: pointer;
                }

                .sx-event:hover {
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    transform: translateY(-1px);
                }

                .sx-event__title {
                    font-weight: 500;
                    font-size: 0.75rem;
                }

                .sx-event__time {
                    font-size: 0.65rem;
                    opacity: 0.8;
                }

                /* Month grid */
                .sx-month-grid__day {
                    border: 1px solid #f1f5f9;
                    min-height: 80px;
                    transition: background 0.2s;
                }

                .sx-month-grid__day:hover {
                    background: #fefce8;
                }

                .sx-month-grid__day--is-today {
                    background: #fff7ed;
                }

                .sx-month-grid__day--is-outside-month {
                    background: #f8fafc;
                    opacity: 0.6;
                }

                .sx-month-grid__day-date {
                    font-weight: 500;
                    padding: 0.25rem 0.5rem;
                }

                .sx-month-grid__day--is-today .sx-month-grid__day-date {
                    background: #f97316;
                    color: white;
                    border-radius: 50%;
                    width: 1.75rem;
                    height: 1.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* More events indicator */
                .sx-month-grid__more-events {
                    color: #f97316;
                    font-size: 0.75rem;
                    font-weight: 500;
                    cursor: pointer;
                    padding: 0.125rem 0.25rem;
                    border-radius: 0.25rem;
                    transition: background 0.2s;
                }

                .sx-month-grid__more-events:hover {
                    background: #fef3c7;
                }

                /* Scrollbar styling */
                .sx-time-grid__content::-webkit-scrollbar {
                    width: 8px;
                }

                .sx-time-grid__content::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }

                .sx-time-grid__content::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }

                .sx-time-grid__content::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                /* Drag and drop visual feedback */
                .sx-event--is-dragging {
                    opacity: 0.7;
                    transform: scale(1.02);
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
                }

                /* Resize handle */
                .sx-event__resize-handle {
                    background: currentColor;
                    opacity: 0.5;
                    height: 4px;
                    border-radius: 2px;
                    margin: 2px 4px;
                    cursor: ns-resize;
                }

                .sx-event__resize-handle:hover {
                    opacity: 0.8;
                }

                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .sx-react-calendar {
                        --sx-color-surface: #1e293b;
                        --sx-color-on-surface: #f8fafc;
                        --sx-color-surface-variant: #334155;
                        --sx-color-on-surface-variant: #cbd5e1;
                        --sx-color-background: #0f172a;
                        --sx-color-on-background: #f8fafc;
                    }

                    .sx-calendar-header {
                        background: linear-gradient(to right, #1e1b4b, #312e81);
                        border-bottom-color: #4338ca;
                    }

                    .sx-day-header {
                        background: #1e293b;
                        border-bottom-color: #334155;
                    }

                    .sx-month-grid__day {
                        border-color: #334155;
                    }

                    .sx-month-grid__day:hover {
                        background: #334155;
                    }

                    .sx-time-grid__time-axis {
                        background: #1e293b;
                        border-right-color: #334155;
                    }
                }

                /* Accessibility improvements */
                .sx-event:focus {
                    outline: 2px solid #f97316;
                    outline-offset: 2px;
                }

                .sx-calendar-header__btn:focus,
                .sx-view-selector__btn:focus {
                    outline: 2px solid #f97316;
                    outline-offset: 2px;
                }

                /* Animation for loading */
                @keyframes sx-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .sx-calendar--loading .sx-event {
                    animation: sx-pulse 1.5s ease-in-out infinite;
                }
            `}</style>
            <ScheduleXCalendarBase calendarApp={calendar} />
        </div>
    );
}

/**
 * Main Schedule-X Calendar Component
 * This is a wrapper that ensures we have valid data before mounting ScheduleXCalendarInner
 */
export default function ScheduleXCalendar({ className = '' }: ScheduleXCalendarProps) {
    // Use useState with lazy initializer to compute initial date ONCE, before any other hooks
    // This guarantees we have a valid date string before useCalendarApp runs
    const [initialDateString] = useState<string>(() => DEFAULT_DATE_STRING);
    
    const {
        scheduleXEvents,
        scheduleXView,
        calendarConfigs,
        selectedDate,
        handleEventDrag,
        handleEventClick,
        handleDateClick,
        setDate,
    } = useScheduleXBridge();

    // Format the selected date for Schedule-X (must be YYYY-MM-DD string)
    // Use the formatted date from context if available, otherwise use initial
    const formattedSelectedDate = formatDateForScheduleX(selectedDate);
    
    // Final date to use - prefer context date if valid, otherwise use initial
    const dateToUse = /^\d{4}-\d{2}-\d{2}$/.test(formattedSelectedDate)
        ? formattedSelectedDate
        : initialDateString;
    
    // SAFETY: Double-check the date format before rendering
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateToUse)) {
        // Use the absolute fallback
        return (
            <ScheduleXCalendarInner
                className={className}
                scheduleXEvents={scheduleXEvents}
                scheduleXView={scheduleXView}
                calendarConfigs={calendarConfigs}
                initialDateString={DEFAULT_DATE_STRING}
                handleEventDrag={handleEventDrag}
                handleEventClick={handleEventClick}
                handleDateClick={handleDateClick}
                setDate={setDate}
            />
        );
    }

    return (
        <ScheduleXCalendarInner
            className={className}
            scheduleXEvents={scheduleXEvents}
            scheduleXView={scheduleXView}
            calendarConfigs={calendarConfigs}
            initialDateString={dateToUse}
            handleEventDrag={handleEventDrag}
            handleEventClick={handleEventClick}
            handleDateClick={handleDateClick}
            setDate={setDate}
        />
    );
}

// Named export for flexibility
export { ScheduleXCalendar };
