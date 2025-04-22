import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.simplefamilycalendar.app',
  appName: 'Simple Family Calendar',
  webDir: 'build',
  server: {
    // Allow cleartext traffic for development
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    // Allow cleartext traffic for development
    allowMixedContent: true,
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH || 'android/app/debug.keystore',
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD || 'android',
      keystoreAlias: process.env.ANDROID_KEY_ALIAS || 'androiddebugkey',
      keystoreAliasPassword: process.env.ANDROID_KEY_PASSWORD || 'android',
      releaseType: 'APK'
    }
  }
};

export default config;
