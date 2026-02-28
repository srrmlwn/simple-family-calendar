import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import AgendaView from '../components/AgendaView';
import MonthView from '../components/MonthView';
import YearView from '../components/YearView';
import { CalendarView } from '../types/calendar';
import EventForm from '../components/EventForm';
import NLPInput from '../components/NLPInput';
import FamilyMemberFilter from '../components/FamilyMemberFilter';
import OnboardingFlow from '../components/OnboardingFlow';
import eventService, { Event, EventInput, RecurringScope } from '../services/eventService';
import familyMemberService, { FamilyMember } from '../services/familyMemberService';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';

const CalendarPage: React.FC = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [date, setDate] = useState<Date>(new Date());
    const [view, setView] = useState<CalendarView>('week');

    // Year view needs ≥900px for 28 columns to be readable — redirect narrower screens to week
    const isNarrow = useMediaQuery('(max-width: 899px)');
    useEffect(() => {
        if (isNarrow && view === 'year') setView('week');
    }, [isNarrow, view]);
    const [newEventDate, setNewEventDate] = useState<Date | null>(null);
    // Event selected from the NLP results tray — navigate + open EventForm
    const [nlpSelectedEvent, setNlpSelectedEvent] = useState<Event | null>(null);
    // Family member filter
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [filterExpanded, setFilterExpanded] = useState(false);
    // Onboarding overlay
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [twilioPhoneNumber, setTwilioPhoneNumber] = useState<string | null>(null);
    const [twilioJoinCode, setTwilioJoinCode] = useState<string | null>(null);

    // Check whether this is a first-time user by fetching their settings
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const res = await api.get('/api/settings');
                setTwilioPhoneNumber(res.data.twilioPhoneNumber ?? null);
                setTwilioJoinCode(res.data.twilioJoinCode ?? null);
                if (!res.data.onboardingCompleted) {
                    setShowOnboarding(true);
                }
            } catch {
                // If settings fetch fails, don't block the user with onboarding
            }
        };
        checkOnboarding();
    }, []);

    // Fetch events from API with date range filtering
    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Year view fetches the whole calendar year; other views use a 3-month window
            const startDate = view === 'year'
                ? new Date(date.getFullYear(), 0, 1)
                : new Date(date.getFullYear(), date.getMonth() - 1, 1);
            const endDate = view === 'year'
                ? new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
                : new Date(date.getFullYear(), date.getMonth() + 2, 0, 23, 59, 59, 999);

            const eventsData = await eventService.getAll(startDate, endDate);
            setEvents(eventsData);
        } catch (err) {
            setError('Failed to load events. Please try again later.');
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    }, [date, view]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Load family members once on mount
    useEffect(() => {
        familyMemberService.getAll().then(setFamilyMembers).catch(() => {});
    }, []);

    const handleMemberToggle = useCallback((id: string) => {
        setSelectedMemberIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }, []);

    // Auto-expand filter when there are active filters
    useEffect(() => {
        if (selectedMemberIds.length > 0) setFilterExpanded(true);
    }, [selectedMemberIds]);

    const filteredEvents = selectedMemberIds.length === 0
        ? events
        : events.filter(e =>
            (e.familyMembers ?? []).some(m => selectedMemberIds.includes(m.id))
          );

    // Handle date navigation
    const handleNavigate = useCallback((newDate: Date | 'TODAY') => {
        if (newDate === 'TODAY') {
            setDate(new Date());
        } else {
            setDate(newDate);
        }
    }, []);

    // Handle event update. EventInput may carry recurringScope + occurrenceDate for recurring events.
    const handleEventUpdate = useCallback(async (eventId: string, eventData: EventInput) => {
        try {
            const updatedEvent = await eventService.update(eventId, eventData);
            // After a recurring scope update the series may have changed — refetch to stay accurate.
            if (eventData.recurringScope) {
                await fetchEvents();
            } else {
                setEvents(prevEvents =>
                    prevEvents.map(event => event.id === eventId ? updatedEvent : event)
                );
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update event');
            throw err;
        }
    }, [fetchEvents]);

    // Handle event delete. Options carry scope for recurring events.
    const handleEventDelete = useCallback(async (
        eventId: string,
        options?: { recurringScope?: RecurringScope; occurrenceDate?: string }
    ) => {
        try {
            await eventService.delete(eventId, options);
            if (options?.recurringScope) {
                // Series was modified — refetch so virtual occurrences update correctly.
                await fetchEvents();
            } else {
                setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete event');
            throw err;
        }
    }, [fetchEvents]);

    // Handle event save (used by EventForm modal)
    const handleEventSave = useCallback(async (eventData: EventInput) => {
        try {
            const savedEvent = await eventService.create(eventData);
            setEvents(prevEvents => [...prevEvents, savedEvent]);
            setDate(new Date(eventData.startTime));
        } catch (error) {
            console.error('Error saving event:', error);
            throw error;
        }
    }, []);

    // Called by NLPInput after any mutation so we can refresh + navigate
    const handleNLPEventsChanged = useCallback((event?: Event) => {
        fetchEvents();
        if (event) {
            setDate(new Date(event.startTime as Date));
        }
    }, [fetchEvents]);

    // Called when user clicks an event in the NLP results tray
    const handleNLPEventSelect = useCallback((event: Event) => {
        setDate(new Date(event.startTime as Date));
        setNlpSelectedEvent(event);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Header onImportComplete={fetchEvents} />

            {/* Onboarding overlay — shown once for new users */}
            {showOnboarding && (
                <OnboardingFlow
                    userName={user?.firstName ?? 'there'}
                    onComplete={() => setShowOnboarding(false)}
                    twilioPhoneNumber={twilioPhoneNumber}
                    twilioJoinCode={twilioJoinCode}
                />
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3">
                    {error}
                </div>
            )}

            <div className="flex-1 overflow-auto overflow-x-hidden md:overflow-hidden flex flex-col min-h-0">
                {loading ? (
                    <div className="flex justify-center items-center flex-1">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : (
                    <>
                        {/* Toolbar row: family member filter */}
                        {familyMembers.length > 0 && (
                            <div className="flex-shrink-0 px-4 pt-3 pb-2">
                                <FamilyMemberFilter
                                    members={familyMembers}
                                    selectedIds={selectedMemberIds}
                                    onToggle={handleMemberToggle}
                                    onSelectAll={() => setSelectedMemberIds([])}
                                    isExpanded={filterExpanded}
                                    onToggleExpand={() => setFilterExpanded(v => !v)}
                                />
                            </div>
                        )}

                        <div className="flex-1 min-h-0 md:p-4">
                            {view === 'week' && (
                                <AgendaView
                                    events={filteredEvents}
                                    date={date}
                                    onNavigate={handleNavigate}
                                    onEventUpdate={handleEventUpdate}
                                    onEventDelete={handleEventDelete}
                                    onCreateEvent={setNewEventDate}
                                    onViewChange={setView}
                                />
                            )}
                            {view === 'month' && (
                                <MonthView
                                    events={filteredEvents}
                                    date={date}
                                    onNavigate={handleNavigate}
                                    onEventUpdate={handleEventUpdate}
                                    onEventDelete={handleEventDelete}
                                    onCreateEvent={setNewEventDate}
                                    onViewChange={setView}
                                />
                            )}
                            {view === 'year' && (
                                <YearView
                                    events={filteredEvents}
                                    date={date}
                                    onNavigate={handleNavigate}
                                    onViewChange={setView}
                                    onEventUpdate={handleEventUpdate}
                                    onEventDelete={handleEventDelete}
                                />
                            )}
                        </div>

                        {/* New event modal (date cell click) */}
                        {newEventDate && (
                            <div
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                                onClick={(e) => { if (e.target === e.currentTarget) setNewEventDate(null); }}
                            >
                                <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                                    <EventForm
                                        initialDate={newEventDate}
                                        onSubmit={async (eventData) => {
                                            await handleEventSave(eventData);
                                            setNewEventDate(null);
                                        }}
                                        onCancel={() => setNewEventDate(null)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Edit event modal (NLP tray event click) */}
                        {nlpSelectedEvent && (
                            <div
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                                onClick={(e) => { if (e.target === e.currentTarget) setNlpSelectedEvent(null); }}
                            >
                                <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                                    <EventForm
                                        event={nlpSelectedEvent}
                                        onSubmit={async (eventData) => {
                                            await handleEventUpdate(nlpSelectedEvent.id, eventData);
                                            setNlpSelectedEvent(null);
                                        }}
                                        onDelete={async (options?: { recurringScope?: RecurringScope; occurrenceDate?: string }) => {
                                            await handleEventDelete(nlpSelectedEvent.id, options);
                                            setNlpSelectedEvent(null);
                                        }}
                                        onCancel={() => setNlpSelectedEvent(null)}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <NLPInput
                onEventsChanged={handleNLPEventsChanged}
                onEventSelect={handleNLPEventSelect}
                familyMembers={familyMembers}
            />
        </div>
    );
};

export default CalendarPage;
