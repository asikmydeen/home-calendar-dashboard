'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import {
    format,
    isToday,
    isTomorrow,
    isThisWeek,
    addWeeks,
    startOfDay,
    endOfDay,
    isBefore,
    isAfter
} from 'date-fns';
import { EventCard } from '../EventCard';
import { sortEventsByTime } from '@/types/calendar';
import { Calendar, Clock } from 'lucide-react';

interface EventGroup {
    label: string;
    events: ReturnType<typeof sortEventsByTime>;
    isToday?: boolean;
}

export function AgendaView() {
    const { selectedDate, filteredEvents } = useCalendar();

    // Group events by time period
    const groupEvents = (): EventGroup[] => {
        const groups: EventGroup[] = [];
        const today = startOfDay(new Date());
        const tomorrow = startOfDay(addWeeks(today, 0));
        const endOfThisWeek = endOfDay(addWeeks(today, 1));
        const endOfNextWeek = endOfDay(addWeeks(today, 2));

        // Sort all events by start date
        const sortedEvents = [...filteredEvents].sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );

        // Filter out past events (before today)
        const upcomingEvents = sortedEvents.filter(
            event => !isBefore(endOfDay(new Date(event.start)), today)
        );

        // Group by date
        const eventsByDate = new Map<string, typeof upcomingEvents>();
        upcomingEvents.forEach(event => {
            const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
            if (!eventsByDate.has(dateKey)) {
                eventsByDate.set(dateKey, []);
            }
            eventsByDate.get(dateKey)!.push(event);
        });

        // Create groups
        eventsByDate.forEach((events, dateKey) => {
            const date = new Date(dateKey);
            let label: string;

            if (isToday(date)) {
                label = '📍 Today';
            } else if (isTomorrow(date)) {
                label = '🌅 Tomorrow';
            } else if (isThisWeek(date, { weekStartsOn: 0 })) {
                label = format(date, 'EEEE');
            } else if (isBefore(date, endOfNextWeek)) {
                label = format(date, "'Next' EEEE");
            } else {
                label = format(date, 'EEEE, MMMM d');
            }

            groups.push({
                label,
                events: sortEventsByTime(events),
                isToday: isToday(date),
            });
        });

        return groups;
    };

    const eventGroups = groupEvents();

    if (eventGroups.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                    <Calendar className="w-10 h-10 text-zinc-600" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-300 mb-2">No upcoming events</h3>
                <p className="text-zinc-500 max-w-sm">
                    Your schedule is clear! Tap the + button to add a new event.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto space-y-6">
                {eventGroups.map((group, groupIndex) => (
                    <div key={groupIndex}>
                        {/* Group header */}
                        <div className={`
              sticky top-0 z-10 py-2 px-3 rounded-lg mb-3 backdrop-blur-sm
              ${group.isToday
                                ? 'bg-purple-600/20 text-purple-300'
                                : 'bg-zinc-800/80 text-zinc-400'
                            }
            `}>
                            <h3 className="text-sm font-semibold">{group.label}</h3>
                        </div>

                        {/* Events */}
                        <div className="space-y-2 pl-2">
                            {group.events.map(event => (
                                <div
                                    key={event.id}
                                    className="flex gap-4 group"
                                >
                                    {/* Time column */}
                                    <div className="w-20 flex-shrink-0 pt-2 text-right">
                                        {event.isAllDay ? (
                                            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                                                All day
                                            </span>
                                        ) : (
                                            <div>
                                                <div className="text-sm font-medium text-zinc-300">
                                                    {format(new Date(event.start), 'h:mm a')}
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    {format(new Date(event.end), 'h:mm a')}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Event card */}
                                    <div className="flex-1">
                                        <EventCard event={event} variant="full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* End spacer */}
                <div className="h-24" />
            </div>
        </div>
    );
}
