import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { handleAuthCallback } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');
        const errorMessage = searchParams.get('message');

        if (error) {
            console.error('Auth callback error:', { error, message: errorMessage });
            
            // Handle rate limit error specifically
            if (error === 'Too many OAuth attempts') {
                navigate('/login', { 
                    state: { 
                        error: 'Too many sign-in attempts',
                        message: 'Please wait an hour before trying again. This is a security measure to protect your account.'
                    }
                });
                return;
            }

            // Handle other errors
            navigate('/login', { 
                state: { 
                    error: 'Authentication failed',
                    message: errorMessage || 'Please try again.'
                }
            });
            return;
        }

        if (!token) {
            console.error('No token received in callback');
            navigate('/login', { 
                state: { 
                    error: 'Authentication failed',
                    message: 'No authentication token received. Please try again.'
                }
            });
            return;
        }

        // Handle the authentication callback
        handleAuthCallback(token).catch((err) => {
            console.error('Error handling auth callback:', err);
            navigate('/login', { 
                state: { 
                    error: 'Authentication failed',
                    message: err instanceof Error ? err.message : 'Please try again.'
                }
            });
        });
    }, [searchParams, handleAuthCallback, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Completing Authentication
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please wait while we complete your sign in...
                    </p>
                    <div className="mt-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthCallback; 