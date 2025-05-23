import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import LoginPage from './pages/LoginPage';
import Register from './pages/Register';
import Settings from './pages/Settings';
import AuthCallback from './pages/AuthCallback';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';

const App: React.FC = () => {
    console.log("Loading App!");
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/login-test" element={<LoginPage />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/" element={
                        <PrivateRoute>
                            <Calendar />
                        </PrivateRoute>
                    } />
                    <Route path="/settings" element={
                        <PrivateRoute>
                            <Settings />
                        </PrivateRoute>
                    } />
                </Routes>
            </AuthProvider>
        </Router>
    );
};

export default App;