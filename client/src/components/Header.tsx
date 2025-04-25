import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const userName = user ? `${user.firstName} ${user.lastName}` : 'User';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSettingsClick = () => {
        navigate('/settings');
    };

    return (
        <header className="bg-white border-b border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 truncate`}>
                            {userName}'s Calendar
                        </h1>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleSettingsClick}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-50"
                            title="Settings"
                        >
                            <Settings size={18} />
                        </button>

                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-50"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;