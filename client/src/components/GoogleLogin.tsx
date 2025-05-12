import React, { useEffect, useState } from 'react';

interface GoogleLoginProps {
  onLoginSuccess?: (idToken: string) => void;
}

// Type assertion for the Google API response
type GoogleCredentialResponse = {
  credential: string;
  select_by: string;
};

const GoogleLogin: React.FC<GoogleLoginProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Load the Google API script
    const loadGoogleScript = () => {
      // Check if the script is already loaded
      if (document.querySelector('script#google-oauth')) {
        console.log('Google OAuth script already loaded');
        initializeGoogleLogin();
        return;
      }
      
      console.log('Loading Google OAuth script...');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = 'google-oauth';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google OAuth script loaded successfully');
        initializeGoogleLogin();
      };
      script.onerror = (error) => {
        console.error('Error loading Google OAuth script:', error);
        setError('Failed to load Google Sign-In. Please refresh the page.');
      };
      document.body.appendChild(script);
    };
    
    loadGoogleScript();
    
    return () => {
      // Cleanup function to remove the Google script when component unmounts
      const scriptTag = document.querySelector('script#google-oauth');
      if (scriptTag) {
        scriptTag.remove();
      }
      // Also remove any Google containers
      const googleDiv = document.getElementById('g_id_onload');
      if (googleDiv) {
        googleDiv.remove();
      }
    };
  }, []);
  
  const initializeGoogleLogin = () => {
    // Type assertion for the Google API
    const google = (window as any).google;
    if (!google) {
      console.error('Google API not available');
      setError('Google Sign-In is not available. Please refresh the page.');
      return;
    }

    try {
      console.log('Initializing Google Sign-In...');
      // Initialize the Google Identity Services
      google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        prompt_parent_id: 'google-signin-button',
        ux_mode: 'popup',
        context: 'signin',
        flow: 'implicit'
      });
      
      console.log('Rendering Google Sign-In button...');
      // Render the Google Sign-In button
      const buttonContainer = document.getElementById('google-signin-button');
      if (buttonContainer) {
        google.accounts.id.renderButton(
          buttonContainer,
          { 
            type: 'standard', 
            theme: 'outline', 
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 250
          }
        );
        console.log('Google Sign-In button rendered successfully');
      } else {
        console.error('Button container not found');
        setError('Failed to initialize Google Sign-In button.');
      }
    } catch (err) {
      console.error('Error initializing Google Sign-In:', err);
      setError('Failed to initialize Google Sign-In. Please refresh the page.');
    }
  };
  
  const handleCredentialResponse = (response: GoogleCredentialResponse) => {
    console.log('Received Google credential response');
    setIsLoading(true);
    setError(null);
    
    try {
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      // The response contains a credential with an ID token
      const idToken = response.credential;
      console.log('Processing Google login token...');
      
      // Call the onLoginSuccess callback if provided
      if (onLoginSuccess) {
        onLoginSuccess(idToken);
      } else {
        console.warn('No onLoginSuccess callback provided');
      }
    } catch (err) {
      console.error('Error handling Google credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to process Google login');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="google-login-container">
      {error && (
        <div className="text-red-500 mb-4 text-sm">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="loading-spinner">Processing login...</div>
      ) : (
        <div id="google-signin-button"></div>
      )}
    </div>
  );
};

export default GoogleLogin;