import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
    title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'Simple Family Calendar' }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later
            setInstallPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSettingsClick = () => {
        navigate('/settings');
    };

    const handleInstallClick = async () => {
        if (!installPrompt) return;

        // Show the install prompt
        installPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // Clear the saved prompt since it can't be used again
        setInstallPrompt(null);
        setShowInstallButton(false);
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

                        {showInstallButton && (
                            <button
                                onClick={handleInstallClick}
                                className="p-2 rounded-full hover:bg-gray-100"
                                title="Install App"
                            >
                                <Download size={20} className="text-gray-600" />
                            </button>
                        )}

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