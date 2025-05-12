import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleLogin from '../components/GoogleLogin';
import styled from 'styled-components';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #ffffff;
`;

const LoginCard = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Logo = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1.5rem;
`;

const Subtitle = styled.p`
  color: #666;
  margin-bottom: 2rem;
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  margin-top: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #fff3f3;
`;

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLoginSuccess = async (idToken: string) => {
    try {
      // Here you would typically:
      // 1. Send the token to your backend
      // 2. Get a session token
      // 3. Store the session token
      // 4. Redirect to the main app
      console.log('Login successful with token:', idToken);
      
      // For testing, we'll just show a success message and redirect
      setError(null);
      toast.success('Login successful! Redirecting...', {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Simulate a delay before redirect
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      console.error('Login error:', err);
    }
  };

  return (
    <LoginContainer>
      <ToastContainer />
      <LoginCard>
        <Logo>famcal.ai</Logo>
        <Title>Welcome to FamCal</Title>
        <Subtitle>Test Login Page</Subtitle>
        
        <GoogleLogin onLoginSuccess={handleLoginSuccess} />
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage; 