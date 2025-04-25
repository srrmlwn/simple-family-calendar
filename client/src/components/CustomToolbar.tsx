import React from 'react';
import moment from 'moment';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface CustomToolbarProps {
    onNavigate: (date: Date | 'PREV' | 'NEXT' | 'TODAY') => void;
    date: Date;
}

const CustomToolbar: React.FC<CustomToolbarProps> = ({ 
    onNavigate, 
    date
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    // Format the title based on the current view
    const getTitle = () => {
        return moment(date).format('MMMM YYYY');
    };

    return (
        <div className="rbc-toolbar-custom flex justify-between items-center">
            <div className="flex-1" /> {/* Spacer for centering */}
            
            <div className="month-nav flex items-center">
                <button 
                    onClick={() => onNavigate('PREV')}
                    className="toolbar-btn nav-btn"
                    aria-label="Previous"
                >
                    <ChevronLeft size={18} />
                </button>
                <span className="month-label mx-4">{getTitle()}</span>
                <button 
                    onClick={() => onNavigate('NEXT')}
                    className="toolbar-btn nav-btn"
                    aria-label="Next"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="flex-1 flex justify-end">
                {!isMobile && (
                    <button 
                        onClick={() => onNavigate('TODAY')} 
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        aria-label="Go to today"
                    >
                        <CalendarDays size={16} className="mr-2" />
                        Today
                    </button>
                )}
            </div>
        </div>
    );
};

export default CustomToolbar; 