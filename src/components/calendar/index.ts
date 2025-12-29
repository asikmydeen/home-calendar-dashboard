// Calendar components index
export { default as FullPageCalendar } from './FullPageCalendar';
export { default as ScheduleXCalendar } from './ScheduleXCalendar';
export { ViewSwitcher } from './ViewSwitcher';
export { CalendarSidebar } from './CalendarSidebar';
export { EventCard } from './EventCard';
export { EventModal } from './EventModal';
export { QuickAddFAB } from './QuickAddFAB';

// Schedule-X adapter utilities
export {
    toScheduleXEvent,
    toScheduleXEvents,
    fromScheduleXEvent,
    generateCalendarConfigs,
    getMemberInitials,
    getEventMembers,
} from './ScheduleXAdapter';
export type { ScheduleXEvent, ScheduleXCalendarConfig } from './ScheduleXAdapter';
