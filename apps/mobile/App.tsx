import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Subscription } from 'expo-notifications';
import { AuthProvider, useAuth } from './src/lib/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeNotificationSubscription,
} from './src/lib/notifications';

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
        // Handle notification tap - navigate to appropriate screen
        const data = response.notification.request.content.data;
        if (data?.type === 'call') {
          // Navigate to calls screen
        } else if (data?.type === 'message') {
          // Navigate to messages
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
        <StatusBar style="auto" />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
