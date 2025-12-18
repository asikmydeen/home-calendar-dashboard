import React from 'react';
import { Frame } from '@/types/dashboard';
import { format, isSameDay, addDays } from 'date-fns';

interface CalendarFrameProps {
  frame: Frame;
}

// Mock events
const MOCK_EVENTS = [
  { id: '1', title: 'Team Meeting', start: new Date(), end: addDays(new Date(), 0.1), color: '#4285F4' },
  { id: '2', title: 'Lunch with Mom', start: addDays(new Date(), 0), end: addDays(new Date(), 0.2), color: '#34A853' },
  { id: '3', title: 'Doctor Appointment', start: addDays(new Date(), 1), end: addDays(new Date(), 1.1), color: '#EA4335' },
  { id: '4', title: 'Grocery Run', start: addDays(new Date(), 2), end: addDays(new Date(), 2.1), color: '#FBBC05' },
];

export default function CalendarFrame({ frame }: CalendarFrameProps) {
  // In real implementation, fetch from Cloud Function 'getCalendarEvents'
  // which uses the stored server-side refresh token.

  const groupedEvents = MOCK_EVENTS.reduce((acc, event) => {
    const dateKey = format(event.start, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, typeof MOCK_EVENTS>);

  return (
    <div className="h-full w-full overflow-y-auto bg-white dark:bg-zinc-900 p-4">
      <div className="space-y-6">
        {Object.keys(groupedEvents).sort().map(dateKey => {
          const events = groupedEvents[dateKey];
          const date = new Date(dateKey);
          
          return (
            <div key={dateKey}>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2 sticky top-0 bg-white dark:bg-zinc-900 py-1 uppercase tracking-wide">
                {isSameDay(date, new Date()) ? 'Today' : format(date, 'EEEE, MMM do')}
              </h3>
              <div className="space-y-2">
                {events.map(event => (
                  <div key={event.id} className="flex items-start gap-3 p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <div 
                      className="w-1 h-full min-h-[2rem] rounded-full self-stretch" 
                      style={{ backgroundColor: event.color }} 
                    />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{event.title}</div>
                      <div className="text-xs text-zinc-500">
                        {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
