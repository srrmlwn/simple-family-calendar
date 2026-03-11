import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Add Google Fonts import
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

const Register: React.FC = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);

    const navigate = useNavigate();
    const { register, loading, error } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSubmitError(null);

            // Form validation
            if (!firstName.trim()) {
                setSubmitError('First name is required');
                return;
            }

            if (!lastName.trim()) {
                setSubmitError('Last name is required');
                return;
            }

            if (!email.trim()) {
                setSubmitError('Email is required');
                return;
            }

            if (!password) {
                setSubmitError('Password is required');
                return;
            }

            if (password.length < 8) {
                setSubmitError('Password must be at least 8 characters long');
                return;
            }

            if (password !== confirmPassword) {
                setSubmitError('Passwords do not match');
                return;
            }

            await register(firstName, lastName, email, password);

            // Redirect after successful registration
            navigate('/calendar');
        } catch (err) {
            // Auth context will handle setting the error message
            console.error('Registration error:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex flex-col items-center">
                    <img
                        className="h-32 w-auto mb-4"
                        src="/landing_page_logo_1024x1024.png"
                        alt="kinroo.ai Logo"
                    />
                    <h1
                        className="text-4xl font-extrabold text-gray-900 mb-2"
                        style={{
                            fontFamily: 'Nunito, sans-serif',
                            letterSpacing: '-0.03em',
                            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 800
                        }}
                    >
                        kinroo.ai
                    </h1>
                    <p
                        className="text-sm text-gray-600 mb-8"
                        style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 500,
                            letterSpacing: '-0.01em'
                        }}
                    >
                        Planning made easy—type it, say it, done.
                    </p>
                </div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {(submitError || error) && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="text-sm text-red-700">
                                    {submitError || error}
                                </div>
                            </div>
                        )}

                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="first-name" className="sr-only">First Name</label>
                                <input
                                    id="first-name"
                                    name="firstName"
                                    type="text"
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="First Name"
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label htmlFor="last-name" className="sr-only">Last Name</label>
                                <input
                                    id="last-name"
                                    name="lastName"
                                    type="text"
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Last Name"
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label htmlFor="email-address" className="sr-only">Email address</label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Email address"
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Password"
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
                                <input
                                    id="confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Confirm Password"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                            >
                                {loading ? 'Creating account...' : 'Sign up'}
                            </button>
                        </div>

                        <div className="text-sm text-center">
                            <p>
                                Already have an account?{' '}
                                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                    Sign in
                                </Link>
                            </p>
                        </div>

                        <p className="text-center text-xs text-gray-400">
                            By signing up, you agree to our{' '}
                            <Link to="/terms" className="underline hover:text-gray-600">Terms of Service</Link>
                            {' '}and{' '}
                            <Link to="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
