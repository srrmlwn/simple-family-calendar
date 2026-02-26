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
    // Year view needs ≥900px to render 28 columns readably — hide it below that
    const isNarrow = useMediaQuery('(max-width: 899px)');
    const views = isNarrow ? ALL_VIEWS.filter(v => v.key !== 'year') : ALL_VIEWS;

    return (
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {views.map(({ key, label }) => (
                <button
                    key={key}
                    onClick={() => onChange(key)}
                    className={`
                        px-3 py-1 rounded-md text-sm font-medium transition-all
                        ${view === key
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'}
                    `}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

export default ViewSwitcher;
