// Calendar Account Types for Multi-Provider Integration

export type CalendarProvider = 'google' | 'apple' | 'outlook' | 'caldav';

export interface CalendarAccount {
    id: string;
    provider: CalendarProvider;
    email: string;
    displayName: string;
    familyMemberId: string;
    color: string;
    isConnected: boolean;
    lastSyncedAt?: Date;
    error?: string;

    // Provider-specific credentials (stored encrypted in production)
    credentials?: {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: Date;
        caldavUrl?: string;
        caldavUsername?: string;
        // Note: passwords stored encrypted, never in plain text
    };
}

export interface ConnectedCalendar {
    id: string;
    accountId: string;
    externalId: string; // Calendar ID from provider
    name: string;
    color: string;
    isVisible: boolean;
    isPrimary: boolean;
    isReadOnly: boolean;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface AccountState {
    accounts: CalendarAccount[];
    connectedCalendars: ConnectedCalendar[];
    syncStatus: SyncStatus;
    lastSyncError?: string;
}

// Provider metadata
export const PROVIDER_INFO: Record<CalendarProvider, {
    name: string;
    icon: string;
    color: string;
    description: string;
    authType: 'oauth' | 'password' | 'caldav';
}> = {
    google: {
        name: 'Google Calendar',
        icon: '🔵',
        color: '#4285F4',
        description: 'Connect with your Google account',
        authType: 'oauth',
    },
    apple: {
        name: 'Apple Calendar',
        icon: '🍎',
        color: '#000000',
        description: 'Connect with iCloud using app-specific password',
        authType: 'caldav',
    },
    outlook: {
        name: 'Outlook Calendar',
        icon: '📧',
        color: '#0078D4',
        description: 'Connect with your Microsoft account',
        authType: 'oauth',
    },
    caldav: {
        name: 'CalDAV',
        icon: '📅',
        color: '#6B7280',
        description: 'Connect to any CalDAV server (Fastmail, Synology, etc.)',
        authType: 'caldav',
    },
};

// Note: Accounts are now managed via Firestore in AccountsContext
// localStorage is no longer used for account persistence

// Helper functions
export function getAccountsByFamilyMember(
    accounts: CalendarAccount[],
    familyMemberId: string
): CalendarAccount[] {
    return accounts.filter(a => a.familyMemberId === familyMemberId);
}

export function getCalendarsByAccount(
    calendars: ConnectedCalendar[],
    accountId: string
): ConnectedCalendar[] {
    return calendars.filter(c => c.accountId === accountId);
}

export function formatLastSynced(date?: Date): string {
    if (!date) return 'Never synced';

    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
