import React from 'react';
import moment from 'moment';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface CustomToolbarProps {
    onNavigate: (date: Date | 'PREV' | 'NEXT' | 'TODAY') => void;
    date: Date;
}

const CustomToolbar: React.FC<CustomToolbarProps> = ({ 
    onNavigate, 
    date
}) => {
    // Format the title based on the current view
    const getTitle = () => {
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
        </div>
    );
};

export default CustomToolbar; 