import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
    title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'Simple Family Calendar' }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSettingsClick = () => {
        navigate('/settings');
    };

    return (
        <header className="bg-white shadow-sm py-4 px-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold text-gray-800">{title}</h1>

                {user && (
                    <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-600 mr-4">
                            Hello, {user.firstName}
                        </div>

                        <button
                            onClick={handleSettingsClick}
                            className="p-2 rounded-full hover:bg-gray-100"
                            title="Settings"
                        >
                            <Settings size={20} className="text-gray-600" />
                        </button>

                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full hover:bg-gray-100"
                            title="Logout"
                        >
                            <LogOut size={20} className="text-gray-600" />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;