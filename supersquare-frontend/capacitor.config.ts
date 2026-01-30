import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.supersquare.game',
  appName: 'SuperSquare',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;