import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        try {
            setLoading(true);
            setError(null);
            await api.post('/api/auth/forgot-password', { email });
            setSubmitted(true);
        } catch {
            // Always show success to avoid email enumeration
            setSubmitted(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h1 className="text-center text-3xl font-extrabold text-gray-900">kinroo.ai</h1>
                <h2 className="mt-4 text-center text-xl font-semibold text-gray-700">Reset your password</h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-gray-100">
                    {submitted ? (
                        <div className="text-center space-y-4">
                            <div className="text-green-600 text-4xl">✓</div>
                            <p className="text-gray-700 font-medium">Check your inbox</p>
                            <p className="text-sm text-gray-600">
                                If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
                            </p>
                            <p className="text-sm text-gray-500">
                                If you signed up with Google, please use the "Sign in with Google" button instead.
                            </p>
                            <Link to="/login" className="block mt-4 text-sm font-medium text-blue-600 hover:text-blue-500">
                                Back to sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600 mb-6">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>

                            {error && (
                                <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="you@example.com"
                                        disabled={loading}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !email.trim()}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                                >
                                    {loading ? 'Sending...' : 'Send reset link'}
                                </button>
                            </form>

                            <p className="mt-4 text-center text-sm text-gray-600">
                                Remember your password?{' '}
                                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                    Sign in
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
