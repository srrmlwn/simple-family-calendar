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
  
  useEffect(() => {
    // Load the Google API script
    const loadGoogleScript = () => {
      // Check if the script is already loaded
      if (document.querySelector('script#google-oauth')) {
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = 'google-oauth';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleLogin;
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
    if (google) {
      // Initialize the Google Identity Services
      google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      
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
      }
    }
  };
  
  const handleCredentialResponse = (response: GoogleCredentialResponse) => {
    setIsLoading(true);
    
    // The response contains a credential with an ID token
    const idToken = response.credential;
    console.log("idToken", idToken);
    
    // Call the onLoginSuccess callback if provided
    if (onLoginSuccess) {
      onLoginSuccess(idToken);
    }
    
    setIsLoading(false);
  };
  
  return (
    <div className="google-login-container">
      {isLoading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <div id="google-signin-button"></div>
      )}
    </div>
  );
};

export default GoogleLogin;