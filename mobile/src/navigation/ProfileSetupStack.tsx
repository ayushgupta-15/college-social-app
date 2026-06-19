import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CreateProfileScreen from '../screens/auth/CreateProfileScreen';

export type ProfileSetupStackParamList = {
  CreateProfile: undefined;
};

const Stack = createNativeStackNavigator<ProfileSetupStackParamList>();

export default function ProfileSetupStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A1A' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
    </Stack.Navigator>
  );
}
