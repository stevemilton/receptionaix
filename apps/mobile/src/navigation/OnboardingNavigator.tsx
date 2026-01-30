import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BusinessSearchScreen } from '../screens/onboarding/BusinessSearchScreen';
import { ReviewInfoScreen } from '../screens/onboarding/ReviewInfoScreen';
import { AiGreetingScreen } from '../screens/onboarding/AiGreetingScreen';
import { CalendarConnectScreen } from '../screens/onboarding/CalendarConnectScreen';
import { FaqEditorScreen } from '../screens/onboarding/FaqEditorScreen';
import { PhoneSetupScreen } from '../screens/onboarding/PhoneSetupScreen';
import { ConditionsScreen } from '../screens/onboarding/ConditionsScreen';
import { CompleteScreen } from '../screens/onboarding/CompleteScreen';

export type OnboardingStackParamList = {
  BusinessSearch: undefined;
  ReviewInfo: undefined;
  AiGreeting: undefined;
  CalendarConnect: undefined;
  FaqEditor: undefined;
  PhoneSetup: undefined;
  Conditions: undefined;
  Complete: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="BusinessSearch"
    >
      <Stack.Screen name="BusinessSearch" component={BusinessSearchScreen} />
      <Stack.Screen name="ReviewInfo" component={ReviewInfoScreen} />
      <Stack.Screen name="AiGreeting" component={AiGreetingScreen} />
      <Stack.Screen name="CalendarConnect" component={CalendarConnectScreen} />
      <Stack.Screen name="FaqEditor" component={FaqEditorScreen} />
      <Stack.Screen name="PhoneSetup" component={PhoneSetupScreen} />
      <Stack.Screen name="Conditions" component={ConditionsScreen} />
      <Stack.Screen name="Complete" component={CompleteScreen} />
    </Stack.Navigator>
  );
}
