import React, { useState } from 'react';
import moment from 'moment';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid } from 'lucide-react';
import { View } from 'react-big-calendar';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Constants
const MOBILE_BREAKPOINT = '(max-width: 768px)';
const VIEW_NAMES = {
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Events'
};

interface CustomToolbarProps {
    onNavigate: (date: Date | 'PREV' | 'NEXT' | 'TODAY') => void;
    onView: (view: string) => void;
    date: Date;
    view: View;
    views: string[];
}

const CustomToolbar: React.FC<CustomToolbarProps> = ({ 
    onNavigate, 
    onView, 
    date, 
    view, 
    views 
}) => {
    const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
    const [showViewDropdown, setShowViewDropdown] = useState(false);

    // Format the title based on the current view
    const getTitle = () => {
        if (view === 'month') {
            return moment(date).format('MMMM YYYY');
        } else if (view === 'week') {
            const startOfWeek = moment(date).startOf('week');
            const endOfWeek = moment(date).endOf('week');
            return `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D, YYYY')}`;
        } else if (view === 'day') {
            return moment(date).format('MMMM D, YYYY');
        } else if (view === 'agenda') {
            return 'Events';
        }
        return moment(date).format('MMMM YYYY');
    };

    return (
        <div className="rbc-toolbar-custom">
            <button 
                onClick={() => onNavigate('TODAY')} 
                className="toolbar-btn today-btn"
                aria-label="Go to today"
            >
                <CalendarDays size={18} />
            </button>

            {view !== 'agenda' ? (
                <div className="month-nav">
                    <button 
                        onClick={() => onNavigate('PREV')}
                        className="toolbar-btn nav-btn"
                        aria-label="Previous"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="month-label">{getTitle()}</span>
                    <button 
                        onClick={() => onNavigate('NEXT')}
                        className="toolbar-btn nav-btn"
                        aria-label="Next"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            ) : (
                <div className="month-nav">
                    <span className="month-label">{getTitle()}</span>
                </div>
            )}

            <div className="view-selector">
                <button 
                    className="toolbar-btn view-btn"
                    onClick={() => setShowViewDropdown(!showViewDropdown)}
                    aria-haspopup="true"
                    aria-expanded={showViewDropdown}
                    aria-label="Change view"
                >
                    <LayoutGrid size={18} />
                </button>
                
                {showViewDropdown && (
                    <div 
                        className="view-dropdown-menu"
                        role="menu"
                    >
                        {views.map((name: string) => (
                            <button
                                key={name}
                                onClick={() => {
                                    onView(name);
                                    setShowViewDropdown(false);
                                }}
                                className={`view-option ${view === name ? 'active' : ''}`}
                                role="menuitem"
                            >
                                {VIEW_NAMES[name as keyof typeof VIEW_NAMES]}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomToolbar; 