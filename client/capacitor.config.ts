import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.simplefamilycalendar.app',
  appName: 'Simple Family Calendar',
  webDir: 'build',
  server: {
    // Allow cleartext traffic for development
    cleartext: true
  },
  android: {
    // Allow cleartext traffic for development
    allowMixedContent: true
  }
};

export default config;
