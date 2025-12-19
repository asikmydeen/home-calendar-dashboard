'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { FamilyMember } from '@/types/calendar';

// Define the Household State
interface HouseholdState {
    familyMembers: FamilyMember[];
    currentUserMemberId: string | null; // The member ID that represents the current device user
    isLoading: boolean;
    isSynced: boolean; // Whether data is synced with Firestore
}

// Actions
type HouseholdAction =
    | { type: 'RESET_STATE' }
    | { type: 'SET_MEMBERS'; payload: FamilyMember[] }
    | { type: 'ADD_MEMBER'; payload: FamilyMember }
    | { type: 'UPDATE_MEMBER'; payload: FamilyMember }
    | { type: 'DELETE_MEMBER'; payload: string }
    | { type: 'SET_CURRENT_USER_MEMBER_ID'; payload: string }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SYNCED'; payload: boolean }
    | { type: 'LINK_ACCOUNT_TO_MEMBER'; payload: { memberId: string; account: any } }
    | { type: 'UNLINK_ACCOUNT_FROM_MEMBER'; payload: { memberId: string; accountId: string } };

// Initial State
const initialMemberId = 'parent1'; // Default to first parent
const DEFAULT_MEMBERS: FamilyMember[] = [
    { id: 'parent1', name: 'Husband', role: 'husband', color: '#4f46e5', avatar: '👨', gender: 'male', connectedAccounts: [] },
    { id: 'parent2', name: 'Wife', role: 'wife', color: '#ec4899', avatar: '👩', gender: 'female', connectedAccounts: [] },
    { id: 'child1', name: 'Kid 1', role: 'kids', color: '#f59e0b', avatar: '👶', gender: 'male', connectedAccounts: [] },
];

const initialState: HouseholdState = {
    familyMembers: DEFAULT_MEMBERS,
    currentUserMemberId: initialMemberId,
    isLoading: true,
    isSynced: false,
};

// Storage Keys (for migration and current user preference)
const HOUSEHOLD_STORAGE_KEY = 'home-dashboard-household';
const CURRENT_MEMBER_KEY = 'home-dashboard-current-member';

// Reducer
function householdReducer(state: HouseholdState, action: HouseholdAction): HouseholdState {
    switch (action.type) {
        case 'RESET_STATE':
            // Security: Clear all user data when logging out
            return {
                familyMembers: [],
                currentUserMemberId: null,
                isLoading: true,
                isSynced: false,
            };

        case 'SET_MEMBERS':
            return { ...state, familyMembers: action.payload };

        case 'ADD_MEMBER':
            return { ...state, familyMembers: [...state.familyMembers, action.payload] };

        case 'UPDATE_MEMBER':
            return {
                ...state,
                familyMembers: state.familyMembers.map(m =>
                    m.id === action.payload.id ? action.payload : m
                ),
            };

        case 'DELETE_MEMBER':
            return {
                ...state,
                familyMembers: state.familyMembers.filter(m => m.id !== action.payload),
            };

        case 'SET_CURRENT_USER_MEMBER_ID':
            return { ...state, currentUserMemberId: action.payload };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'SET_SYNCED':
            return { ...state, isSynced: action.payload };

        case 'LINK_ACCOUNT_TO_MEMBER': {
            const { memberId, account } = action.payload;
            return {
                ...state,
                familyMembers: state.familyMembers.map(m => {
                    if (m.id !== memberId) return m;
                    // Avoid duplicates
                    const exists = m.connectedAccounts?.some(
                        acc => acc.provider === account.provider && acc.email === account.email
                    );
                    if (exists) return m;

                    return {
                        ...m,
                        connectedAccounts: [...(m.connectedAccounts || []), account]
                    };
                })
            };
        }

        case 'UNLINK_ACCOUNT_FROM_MEMBER': {
            const { memberId, accountId } = action.payload;
            return {
                ...state,
                familyMembers: state.familyMembers.map(m => {
                    if (m.id !== memberId) return m;
                    return {
                        ...m,
                        connectedAccounts: (m.connectedAccounts || []).filter(
                            acc => acc.accountId !== accountId
                        )
                    };
                })
            };
        }

        default:
            return state;
    }
}

// Context
interface HouseholdContextType extends HouseholdState {
    addMember: (member: FamilyMember) => void;
    updateMember: (member: FamilyMember) => void;
    deleteMember: (memberId: string) => void;
    setCurrentUserMemberId: (id: string) => void;
    unlinkAccountFromMember: (memberId: string, accountId: string) => void;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

// Provider
export function HouseholdProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(householdReducer, initialState);

    // Track when we're writing to Firestore to avoid snapshot overwrite race conditions
    const isWritePendingRef = React.useRef(false);

    // Track Firestore listener to clean up on logout
    const firestoreUnsubscribeRef = React.useRef<(() => void) | undefined>(undefined);

    // Load household data - first try Firestore, fallback to localStorage for migration
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const loadHousehold = async () => {
            try {
                const { auth } = await import('@/lib/firebase');
                const { onAuthStateChanged } = await import('firebase/auth');
                const { getFirestore, doc, onSnapshot, setDoc } = await import('firebase/firestore');

                unsubscribe = onAuthStateChanged(auth, async (user) => {
                    // SECURITY: Always clear previous user's data when auth state changes
                    if (firestoreUnsubscribeRef.current) {
                        firestoreUnsubscribeRef.current();
                        firestoreUnsubscribeRef.current = undefined;
                    }

                    if (!user) {
                        // Logged out - reset state to empty and clear localStorage
                        dispatch({ type: 'RESET_STATE' });

                        // SECURITY: Clear localStorage to prevent data leakage to next user
                        localStorage.removeItem(HOUSEHOLD_STORAGE_KEY);
                        localStorage.removeItem(CURRENT_MEMBER_KEY);
                        localStorage.removeItem('pending_google_auth_member_id');
                        localStorage.removeItem('pending_google_auth_initiated_at');

                        dispatch({ type: 'SET_LOADING', payload: false });
                        return;
                    }

                    // New user logging in - reset state first, then load their data
                    dispatch({ type: 'RESET_STATE' });

                    // User is logged in - use Firestore
                    const db = getFirestore();
                    const householdRef = doc(db, 'households', user.uid);

                    // Listen to Firestore for real-time updates
                    const firestoreUnsubscribe = onSnapshot(householdRef, async (snapshot) => {
                        // Skip if we're in the middle of a local write to avoid overwriting
                        if (isWritePendingRef.current) {
                            console.log('[HouseholdContext] Skipping snapshot - write pending');
                            return;
                        }

                        if (snapshot.exists()) {
                            // Load from Firestore
                            const data = snapshot.data();
                            if (data.members && Array.isArray(data.members)) {
                                // Ensure connectedAccounts is always an array
                                const members = data.members.map((m: any) => ({
                                    ...m,
                                    connectedAccounts: m.connectedAccounts || []
                                }));
                                dispatch({ type: 'SET_MEMBERS', payload: members });
                            }
                            if (data.currentMemberId) {
                                dispatch({ type: 'SET_CURRENT_USER_MEMBER_ID', payload: data.currentMemberId });
                            }
                            dispatch({ type: 'SET_SYNCED', payload: true });
                        } else {
                            // No Firestore data - check for localStorage migration
                            try {
                                const stored = localStorage.getItem(HOUSEHOLD_STORAGE_KEY);
                                if (stored) {
                                    const parsed = JSON.parse(stored);
                                    if (parsed && Array.isArray(parsed)) {
                                        // Migrate to Firestore
                                        const membersWithAccounts = parsed.map((m: any) => ({
                                            ...m,
                                            connectedAccounts: m.connectedAccounts || []
                                        }));
                                        await setDoc(householdRef, {
                                            members: membersWithAccounts,
                                            currentMemberId: localStorage.getItem(CURRENT_MEMBER_KEY) || initialMemberId,
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString(),
                                        });
                                        dispatch({ type: 'SET_MEMBERS', payload: membersWithAccounts });
                                        console.log('Migrated household data from localStorage to Firestore');
                                    }
                                } else {
                                    // No localStorage data - start with empty household for new users
                                    // Don't use DEFAULT_MEMBERS - let user add their own members
                                    await setDoc(householdRef, {
                                        members: [],
                                        currentMemberId: null,
                                        createdAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString(),
                                    });
                                }
                                dispatch({ type: 'SET_SYNCED', payload: true });
                            } catch (e) {
                                console.error('Failed to migrate household data', e);
                            }
                        }
                        dispatch({ type: 'SET_LOADING', payload: false });
                    }, (error) => {
                        console.error('Firestore household listener error:', error);
                        dispatch({ type: 'SET_LOADING', payload: false });
                    });

                    // Store the Firestore unsubscribe for cleanup on logout
                    firestoreUnsubscribeRef.current = firestoreUnsubscribe;
                });
            } catch (e) {
                console.error('Failed to setup household listener', e);
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        loadHousehold();

        return () => {
            unsubscribe?.();
        };
    }, []);

    // Save to Firestore when members change (debounced)
    useEffect(() => {
        if (state.isLoading || !state.isSynced) return;

        // Helper to remove undefined values (Firestore doesn't accept them)
        const sanitizeForFirestore = (obj: any): any => {
            if (obj === null || obj === undefined) return null;
            if (Array.isArray(obj)) {
                return obj.map(item => sanitizeForFirestore(item));
            }
            if (typeof obj === 'object') {
                const cleaned: Record<string, any> = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (value !== undefined) {
                        cleaned[key] = sanitizeForFirestore(value);
                    }
                }
                return cleaned;
            }
            return obj;
        };

        const saveToFirestore = async () => {
            try {
                const { auth } = await import('@/lib/firebase');
                const user = auth.currentUser;
                if (!user) return;

                // Set flag to prevent snapshot from overwriting our local state
                isWritePendingRef.current = true;

                const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
                const db = getFirestore();
                const householdRef = doc(db, 'households', user.uid);

                // Sanitize members to remove any undefined values
                const sanitizedMembers = sanitizeForFirestore(state.familyMembers);

                // Build update object
                const updateData: Record<string, any> = {
                    members: sanitizedMembers,
                    updatedAt: new Date().toISOString(),
                };

                // Only include currentMemberId if it has a value
                if (state.currentUserMemberId) {
                    updateData.currentMemberId = state.currentUserMemberId;
                }

                await updateDoc(householdRef, updateData);

                // Clear the flag after a short delay to allow the triggered snapshot to pass
                setTimeout(() => {
                    isWritePendingRef.current = false;
                }, 500);
            } catch (e) {
                console.error('Failed to save household to Firestore', e);
                isWritePendingRef.current = false;
            }
        };

        // Debounce the save
        const timeoutId = setTimeout(saveToFirestore, 500);
        return () => clearTimeout(timeoutId);
    }, [state.familyMembers, state.currentUserMemberId, state.isLoading, state.isSynced]);

    // Save current user selection locally (for quick access before auth)
    useEffect(() => {
        if (state.currentUserMemberId) {
            localStorage.setItem(CURRENT_MEMBER_KEY, state.currentUserMemberId);
        }
    }, [state.currentUserMemberId]);

    // Integration Listener - Links OAuth accounts to members after callback
    useEffect(() => {
        const setupIntegrationListener = async () => {
            if (typeof window === 'undefined') return;

            try {
                const { auth } = await import('@/lib/firebase');
                const { onAuthStateChanged } = await import('firebase/auth');
                const { getFirestore, collection, onSnapshot } = await import('firebase/firestore');

                const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
                    if (!user) return;

                    const db = getFirestore();

                    const unsubscribeFirestore = onSnapshot(
                        collection(db, 'integrations', user.uid, 'accounts'),
                        (snapshot) => {
                            snapshot.docChanges().forEach((change) => {
                                // Handle both new and updated accounts
                                if (change.type === 'added' || change.type === 'modified') {
                                    const data = change.doc.data();
                                    if (data?.accessToken) {
                                        // Found a connected account
                                        const pendingMemberId = localStorage.getItem('pending_google_auth_member_id');
                                        const oauthInitiatedAt = localStorage.getItem('pending_google_auth_initiated_at');

                                        // Check if this account was updated AFTER OAuth was initiated
                                        // This prevents linking accounts that existed before this OAuth flow
                                        const updatedAt = data.updatedAt?.toDate?.() || data.createdAt?.toDate?.();
                                        const initiatedTime = oauthInitiatedAt ? parseInt(oauthInitiatedAt, 10) : 0;
                                        const isNewAccount = updatedAt && (updatedAt.getTime() > initiatedTime);

                                        console.log('[HouseholdContext] Account change detected:', {
                                            type: change.type,
                                            accountId: change.doc.id,
                                            email: data.email,
                                            pendingMemberId,
                                            isNewAccount,
                                            updatedAt: updatedAt?.toISOString(),
                                            initiatedTime: initiatedTime ? new Date(initiatedTime).toISOString() : null
                                        });

                                        // Only link if we have a pending member AND the account was updated after OAuth started
                                        if (pendingMemberId && isNewAccount) {
                                            const accountRef = {
                                                provider: 'google' as const,
                                                email: data.email || user.email || '',
                                                displayName: data.displayName || 'Google Calendar',
                                                accountId: change.doc.id
                                            };

                                            dispatch({
                                                type: 'LINK_ACCOUNT_TO_MEMBER',
                                                payload: { memberId: pendingMemberId, account: accountRef }
                                            });

                                            localStorage.removeItem('pending_google_auth_member_id');
                                            localStorage.removeItem('pending_google_auth_initiated_at');
                                            console.log('[HouseholdContext] Linked account to member:', pendingMemberId, data.email);
                                        }
                                    }
                                }
                            });
                        }
                    );
                    return () => unsubscribeFirestore();
                });
                return () => unsubscribeAuth();
            } catch (e) {
                console.error('Error in integration listener:', e);
            }
        };

        setupIntegrationListener();
    }, []);

    const addMember = useCallback((member: FamilyMember) => {
        // Ensure connectedAccounts is initialized
        const memberWithAccounts = {
            ...member,
            connectedAccounts: member.connectedAccounts || []
        };
        dispatch({ type: 'ADD_MEMBER', payload: memberWithAccounts });
    }, []);

    const updateMember = useCallback((member: FamilyMember) => {
        // Preserve connectedAccounts if not provided
        dispatch({ type: 'UPDATE_MEMBER', payload: member });
    }, []);

    const deleteMember = useCallback((memberId: string) => {
        dispatch({ type: 'DELETE_MEMBER', payload: memberId });
    }, []);

    const setCurrentUserMemberId = useCallback((id: string) => {
        dispatch({ type: 'SET_CURRENT_USER_MEMBER_ID', payload: id });
    }, []);

    const unlinkAccountFromMember = useCallback((memberId: string, accountId: string) => {
        dispatch({ type: 'UNLINK_ACCOUNT_FROM_MEMBER', payload: { memberId, accountId } });
    }, []);

    const value = {
        ...state,
        addMember,
        updateMember,
        deleteMember,
        setCurrentUserMemberId,
        unlinkAccountFromMember,
    };

    return (
        <HouseholdContext.Provider value={value}>
            {children}
        </HouseholdContext.Provider>
    );
}

// Hook
export function useHousehold() {
    const context = useContext(HouseholdContext);
    if (context === undefined) {
        throw new Error('useHousehold must be used within a HouseholdProvider');
    }
    return context;
}
