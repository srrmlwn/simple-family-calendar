import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profileImageError, setProfileImageError] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSettingsClick = () => {
        navigate('/settings');
    };

    // Get user initials for the fallback avatar
    const getUserInitials = () => {
        if (!user) return '';
        const firstInitial = user.firstName?.[0]?.toUpperCase() || '';
        const lastInitial = user.lastName?.[0]?.toUpperCase() || '';
        return `${firstInitial}${lastInitial}`;
    };

    const handleImageError = () => {
        console.log('[Header] Profile image failed to load, falling back to initials');
        setProfileImageError(true);
    };

    return (
        <header className="bg-white border-b border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-3">
                        {user?.profileImage && !profileImageError ? (
                            <img 
                                src={user.profileImage} 
                                alt={`${user.firstName}'s profile`}
                                className="h-8 w-8 rounded-full object-cover border border-gray-200"
                                onError={handleImageError}
                            />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                                <span className="text-sm font-medium text-gray-600">
                                    {getUserInitials()}
                                </span>
                            </div>
                        )}
                        <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 truncate`}>
                            {user?.firstName}'s Calendar
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