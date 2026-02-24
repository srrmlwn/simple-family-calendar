// src/services/eventService.ts
import { AppDataSource } from '../data-source';
import { Event } from '../entities/Event';
import moment from 'moment-timezone';
import { RRule, RRuleSet } from 'rrule';

// A virtual occurrence generated from a recurring master event.
// Has all the master's fields but with adjusted start/end times for this occurrence.
// The masterEventId + occurrenceDate pair uniquely identifies the virtual instance.
export interface VirtualOccurrence extends Omit<Event, 'id'> {
    id: string;           // The master event's DB id (used for updates/deletes)
    masterEventId: string;
    occurrenceDate: string; // ISO UTC — original occurrence start (used to scope edits)
}

export type EventOrOccurrence = Event | VirtualOccurrence;

export class EventService {
    public async create(event: Event): Promise<Event> {
        const eventRepository = AppDataSource.getRepository(Event);

        if (event.startTime) {
            event.startTime = this.convertToUTC(event.startTime);
        }
        if (event.endTime) {
            event.endTime = this.convertToUTC(event.endTime);
        }

        return await eventRepository.save(event);
    }

    public async findByUserIdAndDateRange(
        userId: string,
        startDate?: Date,
        endDate?: Date,
        timezone = 'UTC'
    ): Promise<EventOrOccurrence[]> {
        const eventRepository = AppDataSource.getRepository(Event);

        // Fetch all non-override events for this user.
        // We intentionally skip recurringEventId IS NOT NULL rows here because
        // those are single-occurrence overrides — the expansion step below merges them in.
        let query = eventRepository
            .createQueryBuilder('event')
            .where('event.userId = :userId', { userId })
            .andWhere('event.recurringEventId IS NULL')
            .orderBy('event.startTime', 'ASC');

        // For non-recurring events, respect the date range strictly.
        // For recurring master events we need to fetch all of them regardless of
        // startDate so we can expand their rules — we filter results after expansion.
        // We achieve this by loosening the date filter to include masters whose rrule
        // could extend into the requested window.
        if (startDate && endDate) {
            query = query.andWhere(
                '(event.rrule IS NOT NULL OR (event.startTime >= :startDate AND event.startTime <= :endDate))',
                { startDate, endDate }
            );
        } else if (startDate) {
            query = query.andWhere(
                '(event.rrule IS NOT NULL OR event.startTime >= :startDate)',
                { startDate }
            );
        } else if (endDate) {
            query = query.andWhere(
                '(event.rrule IS NOT NULL OR event.startTime <= :endDate)',
                { endDate }
            );
        }

        const events = await query.getMany();

        // Fetch all single-occurrence overrides for this user in one query.
        const overrides = await eventRepository
            .createQueryBuilder('event')
            .where('event.userId = :userId', { userId })
            .andWhere('event.recurringEventId IS NOT NULL')
            .getMany();

        const overridesByMaster = this.groupOverridesByMaster(overrides);

        // Expand recurring masters; pass through one-time events unchanged.
        const result: EventOrOccurrence[] = [];
        for (const event of events) {
            if (event.rrule) {
                const occurrences = this.expandRecurringEvent(
                    event,
                    startDate,
                    endDate,
                    overridesByMaster[event.id] ?? []
                );
                result.push(...occurrences);
            } else {
                result.push(this.convertEventToTimezone(event, timezone));
            }
        }

        // Convert virtual occurrences' times to the user's timezone too.
        return result.map(e => {
            if ('masterEventId' in e) {
                return this.convertOccurrenceToTimezone(e as VirtualOccurrence, timezone);
            }
            return e;
        }).sort((a, b) =>
            new Date(a.startTime as string).getTime() - new Date(b.startTime as string).getTime()
        );
    }

    public async findById(id: string, timezone = 'UTC'): Promise<Event | null> {
        const eventRepository = AppDataSource.getRepository(Event);
        const event = await eventRepository.findOne({ where: { id } });
        if (!event) return null;
        return this.convertEventToTimezone(event, timezone);
    }

    public async update(id: string, eventData: Partial<Event>): Promise<Event> {
        const eventRepository = AppDataSource.getRepository(Event);
        const existingEvent = await eventRepository.findOne({ where: { id } });

        if (!existingEvent) {
            throw new Error('Event not found');
        }

        if (eventData.startTime) {
            eventData.startTime = this.convertToUTC(eventData.startTime);
        }
        if (eventData.endTime) {
            eventData.endTime = this.convertToUTC(eventData.endTime);
        }

        Object.assign(existingEvent, eventData);
        return await eventRepository.save(existingEvent);
    }

    /**
     * Update a recurring event with scope:
     *  'all'    — update the master row directly
     *  'this'   — add occurrenceDate to master's exceptionDates, create an override row
     *  'future' — set UNTIL on master's rrule to just before occurrenceDate,
     *             create a new master starting from occurrenceDate
     */
    public async updateRecurring(
        masterId: string,
        occurrenceDate: string,
        scope: 'this' | 'future' | 'all',
        changes: Partial<Event>,
        _timezone = 'UTC'
    ): Promise<Event> {
        const eventRepository = AppDataSource.getRepository(Event);
        const master = await eventRepository.findOne({ where: { id: masterId } });
        if (!master) throw new Error('Recurring event not found');

        if (changes.startTime) changes.startTime = this.convertToUTC(changes.startTime);
        if (changes.endTime) changes.endTime = this.convertToUTC(changes.endTime);

        if (scope === 'all') {
            Object.assign(master, changes);
            return await eventRepository.save(master);
        }

        if (scope === 'this') {
            // Skip this occurrence in the master series.
            const occUTC = new Date(occurrenceDate).toISOString().split('T')[0];
            const existing = master.exceptionDates ?? [];
            if (!existing.includes(occUTC)) {
                master.exceptionDates = [...existing, occUTC];
                await eventRepository.save(master);
            }

            // Create an override row for this occurrence.
            const override = eventRepository.create({
                ...master,
                id: undefined as unknown as string,
                rrule: undefined,
                exceptionDates: undefined,
                recurringEventId: master.id,
                exceptionDate: new Date(occurrenceDate),
                ...changes,
            });
            return await eventRepository.save(override);
        }

        // scope === 'future'
        // Terminate the master series just before this occurrence.
        const occDateTime = new Date(occurrenceDate);
        const untilDate = new Date(occDateTime.getTime() - 1000); // 1 second before
        master.rrule = this.setRRuleUntil(master.rrule ?? '', untilDate);
        await eventRepository.save(master);

        // Create a new master starting from this occurrence, inheriting changes.
        // exception dates that fall after the split point should move to the new master;
        // those before stay on the terminated old master.
        const splitDate = new Date(occurrenceDate);
        const oldExceptions = (master.exceptionDates ?? []).filter(
            d => new Date(d) < splitDate
        );
        const newExceptions = (master.exceptionDates ?? []).filter(
            d => new Date(d) >= splitDate
        );
        if (oldExceptions.length !== (master.exceptionDates ?? []).length) {
            master.exceptionDates = oldExceptions.length > 0 ? oldExceptions : undefined;
            await eventRepository.save(master);
        }

        const newMaster = eventRepository.create({
            ...master,
            id: undefined as unknown as string,
            recurringEventId: undefined,
            exceptionDate: undefined,
            startTime: changes.startTime ?? new Date(occurrenceDate),
            endTime: changes.endTime ?? this.shiftEndTime(master, new Date(occurrenceDate)),
            exceptionDates: newExceptions.length > 0 ? newExceptions : undefined,
            ...changes,
            // rrule must come AFTER ...changes so a client-supplied rrule with UNTIL
            // (e.g. the old series' UNTIL) is stripped rather than preserved on the new master.
            rrule: this.removeRRuleUntil(changes.rrule ?? master.rrule ?? ''),
        });
        return await eventRepository.save(newMaster);
    }

    public async delete(id: string): Promise<void> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Delete override occurrences first (in case of master deletion).
            await queryRunner.manager.createQueryBuilder()
                .delete().from('events')
                .where('recurring_event_id = :id', { id })
                .execute();

            await queryRunner.manager.createQueryBuilder()
                .delete().from('event_recipients')
                .where('event_id = :id', { id })
                .execute();

            await queryRunner.manager.createQueryBuilder()
                .delete().from('events')
                .where('id = :id', { id })
                .execute();

            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Delete a recurring event with scope:
     *  'all'    — delete the master (cascades to overrides)
     *  'this'   — add occurrenceDate to master's exceptionDates
     *  'future' — set UNTIL on master's rrule to just before occurrenceDate
     */
    public async deleteRecurring(
        masterId: string,
        occurrenceDate: string,
        scope: 'this' | 'future' | 'all'
    ): Promise<void> {
        const eventRepository = AppDataSource.getRepository(Event);
        const master = await eventRepository.findOne({ where: { id: masterId } });
        if (!master) throw new Error('Recurring event not found');

        if (scope === 'all') {
            await this.delete(masterId);
            return;
        }

        if (scope === 'this') {
            const occUTC = new Date(occurrenceDate).toISOString().split('T')[0];
            const existing = master.exceptionDates ?? [];

            const queryRunner = AppDataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            try {
                // Add the date to exception_dates so the rrule expander skips it.
                if (!existing.includes(occUTC)) {
                    master.exceptionDates = [...existing, occUTC];
                    await queryRunner.manager.save(master);
                }
                // Remove any stored override for this exact occurrence.
                await queryRunner.manager.createQueryBuilder()
                    .delete().from(Event)
                    .where('recurring_event_id = :id AND exception_date = :date', {
                        id: masterId,
                        date: new Date(occurrenceDate),
                    })
                    .execute();
                await queryRunner.commitTransaction();
            } catch (err) {
                await queryRunner.rollbackTransaction();
                throw err;
            } finally {
                await queryRunner.release();
            }
            return;
        }

        // scope === 'future'
        const occDateTime = new Date(occurrenceDate);
        const untilDate = new Date(occDateTime.getTime() - 1000);
        master.rrule = this.setRRuleUntil(master.rrule ?? '', untilDate);
        await eventRepository.save(master);

        // Also delete stored overrides that fall on or after the cut-off.
        await eventRepository.createQueryBuilder()
            .delete().from(Event)
            .where('recurring_event_id = :id AND exception_date >= :date', {
                id: masterId,
                date: occDateTime,
            })
            .execute();
    }

    public async findByDateRange(
        startDate: Date,
        endDate: Date,
        timezone = 'UTC'
    ): Promise<Event[]> {
        const eventRepository = AppDataSource.getRepository(Event);

        const events = await eventRepository
            .createQueryBuilder('event')
            .where('event.startTime >= :startDate', { startDate })
            .andWhere('event.startTime <= :endDate', { endDate })
            .orderBy('event.startTime', 'ASC')
            .getMany();

        return this.convertEventsToTimezone(events, timezone);
    }

    public async findUpcomingEvents(
        userId: string,
        limit = 5,
        timezone = 'UTC'
    ): Promise<Event[]> {
        const eventRepository = AppDataSource.getRepository(Event);
        const now = new Date();

        const events = await eventRepository
            .createQueryBuilder('event')
            .where('event.userId = :userId', { userId })
            .andWhere('event.startTime >= :now', { now })
            .orderBy('event.startTime', 'ASC')
            .take(limit)
            .getMany();

        return this.convertEventsToTimezone(events, timezone);
    }

    // ─── Recurrence helpers ─────────────────────────────────────────────────

    /**
     * Expand a recurring master event into virtual occurrences within
     * [startDate, endDate], applying exception dates and stored overrides.
     */
    private expandRecurringEvent(
        master: Event,
        startDate: Date | undefined,
        endDate: Date | undefined,
        overrides: Event[]
    ): (Event | VirtualOccurrence)[] {
        if (!master.rrule) return [];

        const masterStart = new Date(master.startTime as string);
        const duration =
            new Date(master.endTime as string).getTime() -
            masterStart.getTime();

        let rule: RRule;
        try {
            // dtstart must be set so expansion uses the right base date.
            rule = RRule.fromString(`DTSTART:${this.toRRuleDTSTART(masterStart)}\nRRULE:${master.rrule}`);
        } catch {
            return [];
        }

        const rruleSet = new RRuleSet();
        rruleSet.rrule(rule);

        // Add manual exception dates to the rrule set.
        for (const exDate of master.exceptionDates ?? []) {
            const d = new Date(exDate);
            // Match on the date only — set time to match masterStart's time.
            const exDateTime = new Date(
                Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
                    masterStart.getUTCHours(), masterStart.getUTCMinutes(), 0)
            );
            rruleSet.exdate(exDateTime);
        }

        // Also exclude dates that have stored overrides (those are returned separately).
        const overrideDateKeys = new Set(
            overrides.map(o => new Date(o.exceptionDate as string).toISOString().split('T')[0])
        );

        const rangeStart = startDate ?? new Date(0);
        const rangeEnd = endDate ?? new Date('2100-01-01');

        const dates = rruleSet.between(rangeStart, rangeEnd, true);

        const result: (Event | VirtualOccurrence)[] = [];

        const emittedOverrideDateKeys = new Set<string>();

        for (const occurrenceStart of dates) {
            const dateKey = occurrenceStart.toISOString().split('T')[0];

            // If there's a stored override for this date, include it instead.
            if (overrideDateKeys.has(dateKey)) {
                const override = overrides.find(
                    o => new Date(o.exceptionDate as string).toISOString().split('T')[0] === dateKey
                );
                if (override) {
                    result.push(override);
                    emittedOverrideDateKeys.add(dateKey);
                }
                continue;
            }

            const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);

            const virtual: VirtualOccurrence = {
                ...master,
                startTime: occurrenceStart.toISOString(),
                endTime: occurrenceEnd.toISOString(),
                masterEventId: master.id,
                occurrenceDate: occurrenceStart.toISOString(),
            };
            result.push(virtual);
        }

        // Emit any stored overrides whose exceptionDate falls within the range but
        // whose original occurrence date was excluded from rrule expansion (because
        // it was added to exceptionDates during the "edit this occurrence" flow).
        // Without this, edited single occurrences would be invisible in the calendar.
        for (const override of overrides) {
            if (!override.exceptionDate) continue;
            const overrideDate = new Date(override.exceptionDate as string);
            if (overrideDate >= rangeStart && overrideDate <= rangeEnd) {
                const dateKey = overrideDate.toISOString().split('T')[0];
                if (!emittedOverrideDateKeys.has(dateKey)) {
                    result.push(override);
                }
            }
        }

        return result;
    }

    private groupOverridesByMaster(overrides: Event[]): Record<string, Event[]> {
        const map: Record<string, Event[]> = {};
        for (const o of overrides) {
            if (!o.recurringEventId) continue;
            if (!map[o.recurringEventId]) map[o.recurringEventId] = [];
            map[o.recurringEventId].push(o);
        }
        return map;
    }

    /** Replaces or appends UNTIL= in a RRULE string. */
    private setRRuleUntil(rruleStr: string, until: Date): string {
        const untilStr = until.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        if (/UNTIL=/.test(rruleStr)) {
            return rruleStr.replace(/UNTIL=[^;]+/, `UNTIL=${untilStr}`);
        }
        // Remove COUNT if present (UNTIL and COUNT are mutually exclusive).
        const withoutCount = rruleStr.replace(/;?COUNT=\d+/, '');
        return `${withoutCount};UNTIL=${untilStr}`;
    }

    /** Removes UNTIL= from a RRULE string (used when forking a new master). */
    private removeRRuleUntil(rruleStr: string): string {
        return rruleStr.replace(/;?UNTIL=[^;]+/, '');
    }

    /** Compute where the end time should land for a new occurrence given the original duration. */
    private shiftEndTime(master: Event, newStart: Date): Date {
        const origStart = new Date(master.startTime as string);
        const origEnd = new Date(master.endTime as string);
        const duration = origEnd.getTime() - origStart.getTime();
        return new Date(newStart.getTime() + duration);
    }

    /** Format a Date as a RRULE DTSTART string: YYYYMMDDTHHMMSSZ */
    private toRRuleDTSTART(d: Date): string {
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    // ─── Timezone helpers ────────────────────────────────────────────────────

    private convertToUTC(date: Date | string): Date {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return new Date(Date.UTC(
            dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(),
            dateObj.getUTCHours(), dateObj.getUTCMinutes(), dateObj.getUTCSeconds(),
            dateObj.getUTCMilliseconds()
        ));
    }

    private convertEventToTimezone(event: Event, timezone: string): Event {
        const converted = { ...event };
        if (converted.startTime) {
            converted.startTime = moment(converted.startTime).tz(timezone).format('YYYY-MM-DDTHH:mm:ss.SSS');
        }
        if (converted.endTime) {
            converted.endTime = moment(converted.endTime).tz(timezone).format('YYYY-MM-DDTHH:mm:ss.SSS');
        }
        return converted;
    }

    private convertOccurrenceToTimezone(occ: VirtualOccurrence, timezone: string): VirtualOccurrence {
        return {
            ...occ,
            startTime: moment(occ.startTime).tz(timezone).format('YYYY-MM-DDTHH:mm:ss.SSS'),
            endTime: moment(occ.endTime).tz(timezone).format('YYYY-MM-DDTHH:mm:ss.SSS'),
        };
    }

    private convertEventsToTimezone(events: Event[], timezone: string): Event[] {
        return events.map(e => this.convertEventToTimezone(e, timezone));
    }
}

export default new EventService();
