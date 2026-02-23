/**
 * Utilities for building and parsing RFC 5545 RRULE strings.
 * Supports the patterns available in EventForm.
 */

export type RecurrencePattern =
    | 'none'
    | 'daily'
    | 'weekly'
    | 'biweekly'
    | 'monthly'
    | 'monthly-first-weekday';

export const RECURRENCE_LABELS: Record<RecurrencePattern, string> = {
    none: 'Does not repeat',
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    monthly: 'Monthly (same date)',
    'monthly-first-weekday': 'Monthly (1st weekday)',
};

// Maps JS Date.getDay() → RRULE byday abbreviation
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Build an RFC 5545 RRULE string (without DTSTART) for the given pattern.
 * @param pattern   The recurrence pattern to encode.
 * @param startDate The first occurrence — used to derive BYDAY.
 * @param endsOn    Optional end date string (YYYY-MM-DD); if omitted the series never ends.
 */
export function buildRRule(
    pattern: RecurrencePattern,
    startDate: Date,
    endsOn?: string
): string | undefined {
    if (pattern === 'none') return undefined;

    const day = BYDAY[startDate.getDay()];
    const until = endsOn
        ? `;UNTIL=${endsOn.replace(/-/g, '')}T000000Z`
        : '';

    switch (pattern) {
        case 'daily':
            return `FREQ=DAILY${until}`;
        case 'weekly':
            return `FREQ=WEEKLY;BYDAY=${day}${until}`;
        case 'biweekly':
            return `FREQ=WEEKLY;INTERVAL=2;BYDAY=${day}${until}`;
        case 'monthly':
            return `FREQ=MONTHLY${until}`;
        case 'monthly-first-weekday': {
            // nth(1) occurrence of the weekday in the month
            return `FREQ=MONTHLY;BYDAY=1${day}${until}`;
        }
        default:
            return undefined;
    }
}

/**
 * Parse a stored RRULE string back into a { pattern, endsOn } pair.
 * Returns { pattern: 'none' } if the string cannot be parsed.
 */
export function parseRRule(rrule: string): { pattern: RecurrencePattern; endsOn?: string } {
    if (!rrule) return { pattern: 'none' };

    const parts = rrule.toUpperCase().split(';');
    const get = (key: string) => {
        const p = parts.find(p => p.startsWith(`${key}=`));
        return p ? p.split('=')[1] : undefined;
    };

    const freq = get('FREQ');
    const interval = get('INTERVAL');
    const byday = get('BYDAY');
    const until = get('UNTIL');

    let endsOn: string | undefined;
    if (until) {
        // Convert YYYYMMDDTHHMMSSZ → YYYY-MM-DD
        endsOn = `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`;
    }

    let pattern: RecurrencePattern = 'none';

    if (freq === 'DAILY') {
        pattern = 'daily';
    } else if (freq === 'WEEKLY' && interval === '2') {
        pattern = 'biweekly';
    } else if (freq === 'WEEKLY') {
        pattern = 'weekly';
    } else if (freq === 'MONTHLY' && byday && /^\d/.test(byday)) {
        pattern = 'monthly-first-weekday';
    } else if (freq === 'MONTHLY') {
        pattern = 'monthly';
    }

    return { pattern, endsOn };
}

/**
 * Human-readable summary of an rrule string, e.g. "Every Monday until Dec 20, 2026".
 */
export function describeRRule(rrule: string): string {
    const { pattern, endsOn } = parseRRule(rrule);
    const label = RECURRENCE_LABELS[pattern];
    if (endsOn) {
        const d = new Date(endsOn + 'T00:00:00');
        return `${label} until ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return label;
}
