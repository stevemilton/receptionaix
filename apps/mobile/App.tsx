import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Subscription } from 'expo-notifications';
import { AuthProvider, useAuth } from './src/lib/AuthContext';
import { RootNavigator, navigationRef } from './src/navigation/RootNavigator';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeNotificationSubscription,
} from './src/lib/notifications';
import { colors } from './src/theme';

function AppContent() {
  const { user } = useAuth();
  const notificationListener = useRef<Subscription | null>(null);
  const responseListener = useRef<Subscription | null>(null);

  useEffect(() => {
    if (user) {
      // Register for push notifications when user logs in
      registerForPushNotifications(user.id);
    }

    // Set up notification listeners
    notificationListener.current = addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    responseListener.current = addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        const data = response.notification.request.content.data;
        if (navigationRef.isReady()) {
          if (data?.type === 'call') {
            (navigationRef as any).navigate('Tabs', { screen: 'Calls' });
          } else if (data?.type === 'message') {
            (navigationRef as any).navigate('Tabs', { screen: 'Calls' });
          }
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
