import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';
import ImportButton from './ImportButton';

interface HeaderProps {
    onImportComplete?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onImportComplete }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profileImageError, setProfileImageError] = useState(false);
    const [showLogoutMenu, setShowLogoutMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
    };

    const getUserInitials = () => {
        if (!user) return '';
        const firstInitial = user.firstName?.[0]?.toUpperCase() || '';
        const lastInitial = user.lastName?.[0]?.toUpperCase() || '';
        return `${firstInitial}${lastInitial}`;
    };

    return (
        <header style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
            {user?.managingFamilyId && (
                <div
                    className="text-xs text-center py-1 px-4 font-medium"
                    style={{ backgroundColor: 'var(--accent)', color: '#fef3e6' }}
                >
                    Co-managing {user.managingFamilyName ? `${user.managingFamilyName}'s` : 'a'} family calendar
                </div>
            )}
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-14">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <img
                            className="h-7 w-auto"
                            src="/landing_page_logo_1024x1024.png"
                            alt="kinroo.ai Logo"
                        />
                        <h1
                            className={`font-display ${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}
                            style={{
                                letterSpacing: '-0.04em',
                                color: 'var(--text-base)',
                                fontVariantNumeric: 'normal',
                            }}
                        >
                            kinroo<span style={{ color: 'var(--accent-mid)' }}>.ai</span>
                        </h1>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        {onImportComplete && (
                            <ImportButton onImportComplete={onImportComplete} compact={isMobile} />
                        )}
                        <button
                            onClick={() => navigate('/settings')}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-app)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            title="Settings"
                            aria-label="Settings"
                        >
                            <Settings size={18} />
                        </button>

                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                                className="flex items-center focus:outline-none"
                                aria-label="Profile menu"
                                aria-expanded={showLogoutMenu}
                                aria-haspopup="true"
                            >
                                {user?.profileImage && !profileImageError ? (
                                    <img
                                        src={user.profileImage}
                                        alt={`${user.firstName}'s profile`}
                                        className="h-8 w-8 rounded-full object-cover"
                                        style={{ border: '2px solid var(--border)' }}
                                        onError={() => setProfileImageError(true)}
                                    />
                                ) : (
                                    <div
                                        className="h-8 w-8 rounded-full flex items-center justify-center"
                                        style={{
                                            backgroundColor: 'var(--accent-bg)',
                                            border: '2px solid var(--accent-border)',
                                        }}
                                    >
                                        <span
                                            className="text-xs font-bold"
                                            style={{ color: 'var(--accent)' }}
                                        >
                                            {getUserInitials()}
                                        </span>
                                    </div>
                                )}
                            </button>

                            {showLogoutMenu && (
                                <div
                                    className="absolute right-0 mt-2 w-52 rounded-xl shadow-lg z-50 overflow-hidden"
                                    style={{
                                        backgroundColor: 'var(--bg-surface)',
                                        border: '1px solid var(--border)',
                                    }}
                                >
                                    <div
                                        className="px-4 py-3"
                                        style={{ borderBottom: '1px solid var(--border)' }}
                                    >
                                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-base)' }}>
                                            {user?.firstName} {user?.lastName}
                                        </p>
                                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {user?.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setShowLogoutMenu(false); navigate('/settings'); }}
                                        className="w-full flex items-center px-4 py-2.5 text-sm transition-colors"
                                        style={{ color: 'var(--text-base)' }}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-app)')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        <Settings size={14} className="mr-2.5" style={{ color: 'var(--text-muted)' }} />
                                        Settings
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center px-4 py-2.5 text-sm transition-colors"
                                        style={{ color: 'var(--text-base)' }}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-app)')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        <LogOut size={14} className="mr-2.5" style={{ color: 'var(--text-muted)' }} />
                                        Sign out
                                    </button>
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
