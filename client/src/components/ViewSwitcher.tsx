import React from 'react';
import { CalendarView } from '../types/calendar';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface ViewSwitcherProps {
    view: CalendarView;
    onChange: (view: CalendarView) => void;
}

const ALL_VIEWS: { key: CalendarView; label: string }[] = [
    { key: 'week',  label: 'Week'  },
    { key: 'month', label: 'Month' },
    { key: 'year',  label: 'Year'  },
];

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ view, onChange }) => {
    const isNarrow = useMediaQuery('(max-width: 899px)');
    const views = isNarrow ? ALL_VIEWS.filter(v => v.key !== 'year') : ALL_VIEWS;

    return (
        <div
            className="flex items-center rounded-lg p-0.5 gap-0.5"
            style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)' }}
        >
            {views.map(({ key, label }) => (
                <button
                    key={key}
                    onClick={() => onChange(key)}
                    className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
                    style={view === key
                        ? { backgroundColor: 'var(--bg-surface)', color: 'var(--accent)', boxShadow: '0 1px 3px rgba(30,26,20,0.1)', border: '1px solid var(--border)' }
                        : { color: 'var(--text-muted)', border: '1px solid transparent' }
                    }
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

export default ViewSwitcher;
