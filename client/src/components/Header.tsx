import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profileImageError, setProfileImageError] = useState(false);
    const [showLogoutMenu, setShowLogoutMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowLogoutMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setShowLogoutMenu(false);
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

    const toggleLogoutMenu = () => {
        setShowLogoutMenu(!showLogoutMenu);
    };

    return (
        <header className="bg-white border-b border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left side - Logo and Brand */}
                    <div className="flex items-center space-x-3">
                        <img
                            className="h-8 w-auto"
                            src="/landing_page_logo_1024x1024.png"
                            alt="FamCal Logo"
                        />
                        <h1 
                            className={`${isMobile ? 'text-lg' : 'text-xl'} font-extrabold text-gray-900`}
                            style={{ 
                                fontFamily: 'Nunito, sans-serif',
                                letterSpacing: '-0.03em',
                                fontWeight: 800
                            }}
                        >
                            famcal.ai
                        </h1>
                    </div>

                    {/* Right side - Settings and Profile */}
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={handleSettingsClick}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
                            title="Settings"
                        >
                            <Settings size={20} />
                        </button>

                        {/* Profile Menu */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={toggleLogoutMenu}
                                className="flex items-center focus:outline-none"
                                title="Profile menu"
                            >
                                {user?.profileImage && !profileImageError ? (
                                    <img 
                                        src={user.profileImage} 
                                        alt={`${user.firstName}'s profile`}
                                        className="h-8 w-8 rounded-full object-cover border border-gray-200 hover:border-gray-300 transition-colors"
                                        onError={handleImageError}
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors">
                                        <span className="text-sm font-medium text-gray-600">
                                            {getUserInitials()}
                                        </span>
                                    </div>
                                )}
                            </button>

                            {/* Logout Menu Dropdown */}
                            {showLogoutMenu && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <LogOut size={16} className="mr-2" />
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;