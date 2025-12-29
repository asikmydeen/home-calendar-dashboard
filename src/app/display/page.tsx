'use client';

import { useState, useEffect, Suspense, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { DashboardLayout, DEFAULT_THEME, DashboardPage } from '@/types/dashboard';
import { Loader2, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { DisplayCalendarProvider, RawCalendarData } from '@/contexts/DisplayCalendarContext';
import { FamilyMember } from '@/types/calendar';

const DashboardGrid = dynamic(() => import('@/components/dashboard/DashboardGrid'), { ssr: false });
const PageCarousel = dynamic(() => import('@/components/dashboard/PageCarousel'), { ssr: false });
const PageIndicator = dynamic(() => import('@/components/dashboard/PageIndicator'), { ssr: false });
const VisualOverlay = dynamic(() => import('@/components/effects/VisualOverlay'), { ssr: false });

const FONT_CLASSES: Record<string, string> = {
    'inter': 'font-sans',
    'outfit': 'font-sans',
    'space-grotesk': 'font-sans',
    'playfair': 'font-serif',
    'jetbrains-mono': 'font-mono',
};

/**
 * Display data response from getDisplayData Cloud Function
 * This is similar to DashboardLayout but with additional display-specific fields
 */
interface DisplayDataResponse {
    // Dashboard data
    id: string;
    name: string;
    ownerId: string;
    pages: DashboardPage[];
    currentPageIndex: number;
    createdAt: number;
    updatedAt: number;
    cols: number;
    theme?: typeof DEFAULT_THEME;
    
    // Display-specific
    notFound?: boolean;
    calendarData?: RawCalendarData | null;
    familyMembers?: FamilyMember[];
}

/**
 * Wrapper component that conditionally provides calendar context for display mode
 */
function DisplayCalendarWrapper({
    calendarData,
    familyMembers,
    displayId,
    children
}: {
    calendarData: RawCalendarData | null | undefined;
    familyMembers?: FamilyMember[];
    displayId: string;
    children: ReactNode;
}) {
    // If we have calendar data, wrap children with the DisplayCalendarProvider
    if (calendarData && calendarData.events) {
        return (
            <DisplayCalendarProvider
                calendarData={calendarData}
                familyMembers={familyMembers || []}
                displayId={displayId}
            >
                {children}
            </DisplayCalendarProvider>
        );
    }
    
    // Otherwise, render children without the calendar context
    return <>{children}</>;
}

function DisplayPageContent() {
    const searchParams = useSearchParams();
    const displayId = searchParams.get('id');

    const [dashboard, setDashboard] = useState<DashboardLayout | null>(null);
    const [calendarData, setCalendarData] = useState<RawCalendarData | null>(null);
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    useEffect(() => {
        async function fetchDisplayData() {
            if (!displayId) {
                setError('No display ID provided');
                setLoading(false);
                return;
            }

            try {
                const getDisplayData = httpsCallable(functions, 'getDisplayData');
                const result = await getDisplayData({ displayId });
                const data = result.data as DisplayDataResponse;

                if (data.notFound) {
                    setError('Dashboard not found for this display owner.');
                } else {
                    // Extract calendar data if present
                    const { calendarData: calData, familyMembers: members, ...dashboardData } = data;
                    
                    setDashboard(dashboardData);
                    setCalendarData(calData || null);
                    setFamilyMembers(members || []);
                    
                    if (calData) {
                        console.log('[DisplayPage] Loaded calendar data:', {
                            eventsCount: calData.events?.length || 0,
                            calendarsCount: calData.calendars?.length || 0,
                            accountsCount: calData.accounts?.length || 0,
                        });
                    }
                }
            } catch (err: any) {
                console.error('Error fetching display data:', err);
                setError(err.message || 'Failed to load display');
            } finally {
                setLoading(false);
            }
        }

        fetchDisplayData();
    }, [displayId]);

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-red-400 gap-4 p-4 text-center">
                <AlertCircle className="w-12 h-12" />
                <h1 className="text-xl font-medium">{error || 'Display not found'}</h1>
                <p className="text-zinc-500">Please check the URL and try again.</p>
            </div>
        );
    }

    const theme = dashboard.theme || DEFAULT_THEME;
    const backgroundStyle = theme.background.type === 'image'
        ? { backgroundImage: `url(${theme.background.value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
        : { background: theme.background.value };

    const goToPage = (index: number) => {
        const clampedIndex = Math.max(0, Math.min(index, dashboard.pages.length - 1));
        setCurrentPageIndex(clampedIndex);
    };

    return (
        <DisplayCalendarWrapper calendarData={calendarData} familyMembers={familyMembers} displayId={displayId || ''}>
            <main
                className={`h-screen w-screen text-white relative overflow-hidden ${FONT_CLASSES[theme.font] || 'font-sans'}`}
                style={backgroundStyle}
            >
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                {/* Visual Effects Overlay */}
                {theme.overlay && theme.overlay !== 'none' && (
                    <VisualOverlay effect={theme.overlay} />
                )}

                {/* Page Carousel */}
                <PageCarousel
                    pages={dashboard.pages}
                    currentPageIndex={currentPageIndex}
                    onPageChange={goToPage}
                >
                    {(page: DashboardPage, index: number) => (
                        <div className="h-full w-full p-4 md:p-6 flex flex-col">
                            {/* Page Title (Hidden but kept for layout consistency if needed, or maybe showing it is good) */}
                            {/* Let's show it subtly */}
                            <h1 className="text-2xl font-light mb-4 text-white/50 select-none drop-shadow-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {page.name}
                            </h1>

                            <div className="flex-1 min-h-0 overflow-visible">
                                {page.frames.length > 0 ? (
                                    <DashboardGrid
                                        frames={page.frames}
                                        isEditMode={false} // Read-only
                                        onLayoutChange={() => { }}
                                        onRemoveFrame={() => { }}
                                        onEditFrame={() => { }}
                                        widgetStyle={theme.widgetStyle}
                                    />
                                ) : (
                                    <div className="empty-page-placeholder">
                                        <div className="text-6xl mb-4">✨</div>
                                        <p className="text-xl">Empty page</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </PageCarousel>

                {/* Page Indicator (Optional for display, maybe auto-hide?) */}
                {/* Keeping it for manual navigation if touch enabled */}
                <PageIndicator
                    pages={dashboard.pages}
                    currentIndex={currentPageIndex}
                    onPageSelect={goToPage}
                    isEditMode={false}
                />
            </main>
        </DisplayCalendarWrapper>
    );
}

export default function DisplayPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        }>
            <DisplayPageContent />
        </Suspense>
    );
}
