'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { CalendarProvider as CalendarProviderType } from '@/types/account';

// Types for calendar account management
export interface ConnectedAccount {
    accountId: string;
    provider: CalendarProviderType;
    email: string;
    displayName: string;
    isConnected: boolean;
    lastSyncedAt?: Date;
    error?: string;
    linkedMemberId?: string; // Which family member this account is linked to
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface AccountsState {
    accounts: ConnectedAccount[];
    syncStatus: SyncStatus;
    lastSyncError?: string;
    isLoading: boolean;
}

interface AccountsContextType extends AccountsState {
    // Actions
    connectGoogleAccount: (memberId: string) => Promise<void>;
    disconnectAccount: (accountId: string) => Promise<void>;
    syncAllAccounts: () => Promise<void>;
    getAccountsForMember: (memberId: string) => ConnectedAccount[];
    linkAccountToMember: (accountId: string, memberId: string) => void;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export function AccountsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { familyMembers, updateMember } = useHousehold();

    const [state, setState] = useState<AccountsState>({
        accounts: [],
        syncStatus: 'idle',
        isLoading: true,
    });

    // Use a ref for familyMembers to avoid restarting listener on every update
    // REMOVED: familyMembersRef is no longer needed for the snapshot listener
    // as we will handle linking in a separate effect

    // Store raw data from Firestore to allow re-linking when familyMembers change
    const [rawAccounts, setRawAccounts] = useState<Array<{ id: string, data: any }>>([]);

    // Listen to Firestore for connected accounts
    useEffect(() => {
        if (!user) {
            setState(prev => ({ ...prev, accounts: [], isLoading: false }));
            setRawAccounts([]);
            return;
        }

        let unsubscribe: (() => void) | undefined;

        const setupListener = async () => {
            try {
                const { getFirestore, collection, onSnapshot } = await import('firebase/firestore');
                const db = getFirestore();

                unsubscribe = onSnapshot(
                    collection(db, 'integrations', user.uid, 'accounts'),
                    (snapshot) => {
                        const newRawAccounts: Array<{ id: string, data: any }> = [];
                        snapshot.forEach((doc) => {
                            newRawAccounts.push({ id: doc.id, data: doc.data() });
                        });
                        setRawAccounts(newRawAccounts);
                    },
                    (error) => {
                        console.error('Error listening to accounts:', error);
                        setState(prev => ({
                            ...prev,
                            isLoading: false, // Stop loading on error
                            lastSyncError: error.message,
                        }));
                    }
                );
            } catch (error) {
                console.error('Error setting up accounts listener:', error);
                setState(prev => ({ ...prev, isLoading: false }));
            }
        };

        setupListener();

        return () => {
            unsubscribe?.();
        };
    }, [user]);

    // Derive connected accounts whenever raw data OR family members change
    useEffect(() => {
        const derivedAccounts: ConnectedAccount[] = rawAccounts.map(({ id, data }) => {
            // Find linked member by matching account email to member's connectedAccounts
            const linkedMember = familyMembers.find(m =>
                m.connectedAccounts?.some(acc => acc.accountId === id || acc.email === data.email)
            );

            return {
                accountId: id,
                provider: data.provider || 'google',
                email: data.email || '',
                displayName: data.displayName || data.email || 'Unknown',
                isConnected: !!data.accessToken,
                lastSyncedAt: data.updatedAt?.toDate?.() || undefined,
                error: data.error,
                linkedMemberId: linkedMember?.id,
            };
        });

        setState(prev => {
            // Only update if accounts actually changed to prevent render loops
            const prevJson = JSON.stringify(prev.accounts);
            const newJson = JSON.stringify(derivedAccounts);
            if (prevJson === newJson && !prev.isLoading) {
                return prev;
            }
            return {
                ...prev,
                accounts: derivedAccounts,
                isLoading: false, // Loading is done once we have processed the raw accounts
            };
        });
    }, [rawAccounts, familyMembers]);

    // Connect a Google account for a specific family member using popup
    const connectGoogleAccount = useCallback(async (memberId: string) => {
        if (!user) {
            throw new Error('Must be logged in to connect accounts');
        }

        // Store the member ID AND timestamp for linking after OAuth
        // The timestamp helps us filter out accounts that were already present
        localStorage.setItem('pending_google_auth_member_id', memberId);
        localStorage.setItem('pending_google_auth_initiated_at', Date.now().toString());

        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions();
            const getAuthUrl = httpsCallable(functions, 'getGoogleAuthUrl');

            const result = await getAuthUrl({});
            const data = result.data as { url: string };

            // Open OAuth in a popup window instead of redirecting
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.innerWidth - width) / 2;
            const top = window.screenY + (window.innerHeight - height) / 2;

            const popup = window.open(
                data.url,
                'google-oauth-popup',
                `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
            );

            if (!popup) {
                throw new Error('Popup was blocked. Please allow popups for this site.');
            }

            // The popup will redirect to the callback page, which will handle the token exchange
            // and then close itself. The Firestore listener will detect the new account.
            console.log('[AccountsContext] Opened OAuth popup for member:', memberId);

        } catch (error: any) {
            console.error('Error getting Google auth URL:', error);
            localStorage.removeItem('pending_google_auth_member_id');
            localStorage.removeItem('pending_google_auth_initiated_at');
            throw new Error(error.message || 'Failed to initiate Google connection');
        }
    }, [user]);

    // Disconnect an account
    const disconnectAccount = useCallback(async (accountId: string) => {
        if (!user) return;

        try {
            const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
            const db = getFirestore();

            // Remove from Firestore
            await deleteDoc(doc(db, 'integrations', user.uid, 'accounts', accountId));

            // Also update any family member that had this account linked
            const account = state.accounts.find(a => a.accountId === accountId);
            if (account?.linkedMemberId) {
                const member = familyMembers.find(m => m.id === account.linkedMemberId);
                if (member) {
                    updateMember({
                        ...member,
                        connectedAccounts: (member.connectedAccounts || []).filter(
                            acc => acc.accountId !== accountId && acc.email !== account.email
                        )
                    });
                }
            }
        } catch (error: any) {
            console.error('Error disconnecting account:', error);
            throw new Error(error.message || 'Failed to disconnect account');
        }
    }, [user, state.accounts, familyMembers, updateMember]);

    // Sync all connected accounts
    const syncAllAccounts = useCallback(async () => {
        if (!user || state.accounts.length === 0) return;

        setState(prev => ({ ...prev, syncStatus: 'syncing' }));

        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions();
            const syncCalendars = httpsCallable(functions, 'syncCalendars');

            await syncCalendars({});

            setState(prev => ({
                ...prev,
                syncStatus: 'success',
                lastSyncError: undefined,
            }));

            // Reset status after 3 seconds
            setTimeout(() => {
                setState(prev => prev.syncStatus === 'success' ? { ...prev, syncStatus: 'idle' } : prev);
            }, 3000);
        } catch (error: any) {
            console.error('Error syncing calendars:', error);
            setState(prev => ({
                ...prev,
                syncStatus: 'error',
                lastSyncError: error.message || 'Sync failed',
            }));
        }
    }, [user, state.accounts.length]);

    // Get accounts for a specific family member
    const getAccountsForMember = useCallback((memberId: string): ConnectedAccount[] => {
        return state.accounts.filter(acc => acc.linkedMemberId === memberId);
    }, [state.accounts]);

    // Link an account to a family member
    const linkAccountToMember = useCallback((accountId: string, memberId: string) => {
        const account = state.accounts.find(a => a.accountId === accountId);
        const member = familyMembers.find(m => m.id === memberId);

        if (!account || !member) return;

        // Update member's connectedAccounts
        const existingAccounts = member.connectedAccounts || [];
        const alreadyLinked = existingAccounts.some(
            acc => acc.accountId === accountId || acc.email === account.email
        );

        if (!alreadyLinked) {
            updateMember({
                ...member,
                connectedAccounts: [
                    ...existingAccounts,
                    {
                        provider: account.provider as any,
                        email: account.email,
                        displayName: account.displayName,
                        accountId: account.accountId,
                    }
                ]
            });
        }
    }, [state.accounts, familyMembers, updateMember]);

    const value: AccountsContextType = {
        ...state,
        connectGoogleAccount,
        disconnectAccount,
        syncAllAccounts,
        getAccountsForMember,
        linkAccountToMember,
    };

    return (
        <AccountsContext.Provider value={value}>
            {children}
        </AccountsContext.Provider>
    );
}

export function useAccounts() {
    const context = useContext(AccountsContext);
    if (context === undefined) {
        throw new Error('useAccounts must be used within an AccountsProvider');
    }
    return context;
}
