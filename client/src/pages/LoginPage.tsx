import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleLogin from '../components/GoogleLogin';
import styled from 'styled-components';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Error boundary component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LoginPage Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong loading the login page.</h2>
          <pre style={{ textAlign: 'left', color: 'red' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Debug logs for component mounting
    console.log('LoginPage mounted');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Google Client ID exists:', !!process.env.REACT_APP_GOOGLE_CLIENT_ID);
    
    // Check if required environment variables are set
    if (!process.env.REACT_APP_GOOGLE_CLIENT_ID) {
      console.error('REACT_APP_GOOGLE_CLIENT_ID is not set');
      setError('Google Client ID is not configured. Please check environment variables.');
    }
    
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = async (idToken: string) => {
    try {
      console.log('Login attempt with token:', idToken.substring(0, 10) + '...');
      
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
      console.error('Login error:', err);
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  if (isLoading) {
    return (
      <LoginContainer>
        <LoginCard>
          <div>Loading login page...</div>
        </LoginCard>
      </LoginContainer>
    );
  }

  return (
    <ErrorBoundary>
      <LoginContainer>
        <ToastContainer />
        <LoginCard>
          <Logo>famcal.ai</Logo>
          <Title>Welcome to FamCal</Title>
          <Subtitle>Test Login Page</Subtitle>
          
          {error ? (
            <ErrorMessage>{error}</ErrorMessage>
          ) : (
            <GoogleLogin onLoginSuccess={handleLoginSuccess} />
          )}
        </LoginCard>
      </LoginContainer>
    </ErrorBoundary>
  );
};

export default LoginPage; 