'use client';

import React, { useState, useEffect } from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import {
    CalendarEvent,
    EventCategory,
    RecurrencePattern,
    CATEGORY_ICONS,
    CATEGORY_COLORS
} from '@/types/calendar';
import { format } from 'date-fns';
import {
    X,
    Save,
    Trash2,
    MapPin,
    Clock,
    Calendar,
    Users,
    Repeat,
    Tag,
    AlertCircle
} from 'lucide-react';
import { z } from 'zod';

const RECURRENCE_OPTIONS: { id: RecurrencePattern; label: string }[] = [
    { id: 'none', label: 'Does not repeat' },
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'biweekly', label: 'Every 2 weeks' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
];

const CATEGORY_OPTIONS: { id: EventCategory; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'school', label: 'School' },
    { id: 'medical', label: 'Medical' },
    { id: 'sports', label: 'Sports' },
    { id: 'music', label: 'Music' },
    { id: 'family', label: 'Family' },
    { id: 'work', label: 'Work' },
    { id: 'meal', label: 'Meal' },
    { id: 'routine', label: 'Routine' },
];

const eventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    startDate: z.string().min(1, "Start date is required"),
    startTime: z.string().optional(),
    endDate: z.string().min(1, "End date is required"),
    endTime: z.string().optional(),
    isAllDay: z.boolean(),
}).refine(data => {
    try {
        const startStr = `${data.startDate}T${data.isAllDay ? '00:00' : (data.startTime || '00:00')}`;
        const endStr = `${data.endDate}T${data.isAllDay ? '23:59' : (data.endTime || '23:59')}`;
        const start = new Date(startStr);
        const end = new Date(endStr);
        return end >= start;
    } catch {
        return false;
    }
}, {
    message: "End time must be after start time",
    path: ["endDate"],
});

export function EventModal() {
    const {
        editingEvent,
        closeEventModal,
        addEvent,
        updateEvent,
        deleteEvent,
        calendars,
        familyMembers
    } = useCalendar();

    const isEditing = editingEvent?.id !== '';

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [calendarId, setCalendarId] = useState('family');
    const [category, setCategory] = useState<EventCategory>('general');
    const [recurrence, setRecurrence] = useState<RecurrencePattern>('none');
    const [assignedTo, setAssignedTo] = useState<string[]>([]);

    // Validation state
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initialize form with editing event
    useEffect(() => {
        if (editingEvent) {
            setTitle(editingEvent.title || '');
            setDescription(editingEvent.description || '');
            setLocation(editingEvent.location || '');
            try {
                setStartDate(format(new Date(editingEvent.start), 'yyyy-MM-dd'));
                setStartTime(format(new Date(editingEvent.start), 'HH:mm'));
                setEndDate(format(new Date(editingEvent.end), 'yyyy-MM-dd'));
                setEndTime(format(new Date(editingEvent.end), 'HH:mm'));
            } catch (e) {
                // Fallback for invalid dates
                const now = new Date();
                setStartDate(format(now, 'yyyy-MM-dd'));
                setStartTime(format(now, 'HH:mm'));
                setEndDate(format(now, 'yyyy-MM-dd'));
                setEndTime(format(now, 'HH:mm'));
            }
            setIsAllDay(editingEvent.isAllDay);
            setCalendarId(editingEvent.calendarId);
            setCategory(editingEvent.category);
            setRecurrence(editingEvent.recurrence);
            setAssignedTo(editingEvent.assignedTo);
        } else {
            // Defaults for new event
            const now = new Date();
            // Round to nearest 30 min
            now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30);
            setStartDate(format(now, 'yyyy-MM-dd'));
            setStartTime(format(now, 'HH:mm'));

            const end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour duration
            setEndDate(format(end, 'yyyy-MM-dd'));
            setEndTime(format(end, 'HH:mm'));

            setCalendarId(calendars.find(c => c.isDefault)?.id || 'family');
        }
        setErrors({});
    }, [editingEvent, calendars]);

    const handleSave = () => {
        // Validate
        const validationResult = eventSchema.safeParse({
            title, startDate, startTime, endDate, endTime, isAllDay
        });

        if (!validationResult.success) {
            const newErrors: Record<string, string> = {};
            validationResult.error.issues.forEach(err => {
                const path = err.path[0] as string;
                newErrors[path] = err.message;
            });
            setErrors(newErrors);
            return;
        }

        const start = new Date(`${startDate}T${isAllDay ? '00:00' : startTime}`);
        const end = new Date(`${endDate}T${isAllDay ? '23:59' : endTime}`);

        // INTELLIGENT ROUTING & BROADCAST LOGIC

        // Define target members for the event
        const targetMemberIds = assignedTo.length > 0
            ? assignedTo
            : familyMembers.map(m => m.id); // Default to everyone if no one selected (Family mode)

        if (isEditing && editingEvent) {
            // CAUTION: Editing a broadcasted event is complex.
            // For now, if we are editing, we just update the CURRENT event's ID.
            // We do NOT re-broadcast to avoid duplicating updates or creating zombie copies.
            // The user can delete and recreate if they want to re-broadcast.

            // However, if the user CHANGED the assignment during edit...
            // This is a known limitation. We'll stick to updating the single event instance.
            updateEvent({
                ...editingEvent,
                title: title.trim(),
                description: description.trim() || undefined,
                location: location.trim() || undefined,
                start,
                end,
                isAllDay,
                calendarId, // Keep existing calendar ID when editing
                category,
                recurrence,
                assignedTo,
            });
        } else {
            // NEW EVENT CREATION - Broadcast Mode

            // 1. If strictly creating for ONE person, do standard logic
            if (targetMemberIds.length === 1 && assignedTo.length === 1) {
                const memberId = targetMemberIds[0];
                const member = familyMembers.find(m => m.id === memberId);
                let targetCalId = 'family';

                if (member) {
                    const googleAccount = member.connectedAccounts?.find(acc => acc.provider === 'google');
                    targetCalId = (googleAccount && googleAccount.accountId)
                        ? `google-primary-${googleAccount.accountId}`
                        : `cal-${memberId}`;
                }

                addEvent({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    location: location.trim() || undefined,
                    start,
                    end,
                    isAllDay,
                    calendarId: targetCalId,
                    category,
                    recurrence,
                    assignedTo: [memberId],
                });
            } else {
                // 2. Broadcast Mode: Create separate event for EACH target member
                // This satisfies "created in everyone's calendar"

                targetMemberIds.forEach(memberId => {
                    const member = familyMembers.find(m => m.id === memberId);
                    if (!member) return;

                    let targetCalId = `cal-${memberId}`; // Default to local personal
                    const googleAccount = member.connectedAccounts?.find(acc => acc.provider === 'google');

                    if (googleAccount && googleAccount.accountId) {
                        targetCalId = `google-primary-${googleAccount.accountId}`;
                    }

                    addEvent({
                        title: title.trim(),
                        description: description.trim() || undefined,
                        location: location.trim() || undefined,
                        start,
                        end,
                        isAllDay,
                        calendarId: targetCalId,
                        category,
                        recurrence,
                        assignedTo: [memberId], // Assign to specific individual
                    });
                });
            }
        }

        closeEventModal();
    };

    const handleDelete = () => {
        if (editingEvent?.id && confirm('Are you sure you want to delete this event?')) {
            deleteEvent(editingEvent.id);
            closeEventModal();
        }
    };

    const toggleMember = (memberId: string) => {
        setAssignedTo(prev => {
            const newSelection = prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId];
            return newSelection;
        });
    };

    // Helper to get target calendar name for feedback
    const getTargetCalendarName = () => {
        if (assignedTo.length === 0) return 'Family Calendar';
        if (assignedTo.length > 1) return 'Family Calendar';
        const member = familyMembers.find(m => m.id === assignedTo[0]);
        if (!member) return 'Family Calendar';

        const googleAccount = member.connectedAccounts?.find(acc => acc.provider === 'google');
        if (googleAccount) return `${member.name}'s Google Calendar`;
        return `${member.name}'s Calendar`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={closeEventModal}
            />

            {/* Modal */}
            <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-700 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
                    <h2 className="text-lg font-semibold text-white">
                        {isEditing ? 'Edit Event' : 'New Event'}
                    </h2>
                    <button
                        onClick={closeEventModal}
                        className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-5 overflow-y-auto custom-scrollbar">
                    {/* Title */}
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
                            }}
                            placeholder="Event title"
                            className={`w-full px-4 py-3 bg-zinc-800 border rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg
                                ${errors.title ? 'border-red-500' : 'border-zinc-700'}`}
                            autoFocus
                        />
                        {errors.title && (
                            <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.title}
                            </p>
                        )}
                    </div>

                    {/* Assign to Family Members (MOVED UP) */}
                    <div>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                            <Users className="w-4 h-4" />
                            <span>Assign to</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {familyMembers.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => toggleMember(member.id)}
                                    className={`
                                        px-3 py-1.5 rounded-full text-sm flex items-center gap-2 transition-all border
                                        ${assignedTo.includes(member.id)
                                            ? 'bg-zinc-800 border-zinc-600'
                                            : 'border-zinc-800 bg-transparent hover:bg-zinc-800'
                                        }
                                    `}
                                    style={{
                                        // Use member color only when selected
                                        boxShadow: assignedTo.includes(member.id) ? `0 0 10px -2px ${member.color}80` : 'none',
                                        borderColor: assignedTo.includes(member.id) ? member.color : undefined
                                    }}
                                >
                                    <span className="text-base">{member.avatar}</span>
                                    <span className={assignedTo.includes(member.id) ? 'text-white' : 'text-zinc-400'}>
                                        {member.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {/* Dynamic Feedback */}
                        {!isEditing && (
                            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Saving to: <span className="text-zinc-300">{getTargetCalendarName()}</span>
                            </p>
                        )}
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-3 pt-2 border-t border-zinc-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>Date & Time</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAllDay}
                                    onChange={(e) => setIsAllDay(e.target.checked)}
                                    className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-zinc-900"
                                />
                                <span className="text-sm text-zinc-300">All day</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Start</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                    />
                                    {!isAllDay && (
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-24 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                        />
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">End</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`w-full px-3 py-2 bg-zinc-800 border rounded-lg text-white text-sm ${errors.endDate ? 'border-red-500' : 'border-zinc-700'}`}
                                    />
                                    {!isAllDay && (
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-24 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                        {errors.endDate && (
                            <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.endDate}
                            </p>
                        )}
                    </div>

                    {/* Category (Renamed from Calendar/Category logic) */}
                    <div>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                            <Tag className="w-4 h-4" />
                            <span>Category</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORY_OPTIONS.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all
                                        ${category === cat.id
                                            ? 'text-white shadow-lg scale-105'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }
                                    `}
                                    style={{
                                        backgroundColor: category === cat.id ? CATEGORY_COLORS[cat.id] : undefined
                                    }}
                                >
                                    <span>{CATEGORY_ICONS[cat.id]}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location & Recurrence Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Location */}
                        <div>
                            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                                <MapPin className="w-4 h-4" />
                                <span>Location</span>
                            </div>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Add location"
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 text-sm"
                            />
                        </div>

                        {/* Recurrence */}
                        <div>
                            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                                <Repeat className="w-4 h-4" />
                                <span>Repeat</span>
                            </div>
                            <select
                                value={recurrence}
                                onChange={(e) => setRecurrence(e.target.value as RecurrencePattern)}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                            >
                                {RECURRENCE_OPTIONS.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add notes..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 text-sm resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-800/50 shrink-0">
                    {isEditing ? (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            onClick={closeEventModal}
                            className="px-4 py-2 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {isEditing ? 'Save' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
