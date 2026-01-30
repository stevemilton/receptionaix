import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { CallsScreen } from '../screens/CallsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import {
  EditProfileScreen,
  KnowledgeBaseScreen,
  VoiceSettingsScreen,
  ChangePasswordScreen,
  CalendarSettingsScreen,
} from '../screens/settings';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Calls') {
            iconName = focused ? 'call' : 'call-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Calls"
        component={CallsScreen}
        options={{ title: 'Calls' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitleVisible: false,
        headerTintColor: '#111827',
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Subscription' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Business Profile' }}
      />
      <Stack.Screen
        name="KnowledgeBase"
        component={KnowledgeBaseScreen}
        options={{ title: 'Knowledge Base' }}
      />
      <Stack.Screen
        name="VoiceSettings"
        component={VoiceSettingsScreen}
        options={{ title: 'Voice & Greeting' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen
        name="CalendarSettings"
        component={CalendarSettingsScreen}
        options={{ title: 'Calendar' }}
      />
    </Stack.Navigator>
  );
}
