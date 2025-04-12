declare module 'react-big-calendar' {
    import { Component, ComponentType, ReactNode } from 'react';

    export interface CalendarProps {
        localizer: any;
        events: any[];
        startAccessor?: string | ((event: any) => Date);
        endAccessor?: string | ((event: any) => Date);
        style?: React.CSSProperties;
        views?: string[];
        view?: string;
        date?: Date;
        onView?: (view: string) => void;
        onNavigate?: (date: Date) => void;
        selectable?: boolean;
        onSelectEvent?: (event: any) => void;
        onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
        eventPropGetter?: (event: any) => any;
        components?: {
            event?: ComponentType<{ event: any }>;
            [key: string]: any;
        };
        step?: number;
        showMultiDayTimes?: boolean;
        defaultView?: string;
        [key: string]: any;
    }

    export type View = 'month' | 'week' | 'day' | 'agenda';

    export class Calendar extends Component<CalendarProps> {}
    export const momentLocalizer: (moment: any) => any;
    export const Views: { [key: string]: View };

    const BigCalendar: React.FC<CalendarProps>;
    export default BigCalendar;
}