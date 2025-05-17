declare global {
  interface Window {
    Capacitor?: any;
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: 'select_account' | 'consent';
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
          }) => {
            requestAccessToken: (config?: { prompt?: 'select_account' | 'consent' }) => void;
          };
        };
      };
    };
  }
}

export {}; 