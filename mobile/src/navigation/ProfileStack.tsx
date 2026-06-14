import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen  from '../screens/main/ProfileScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';

// ProfileStack handles the own-profile tab.
// It registers EditProfileScreen so the Edit button can navigate to it.
export type ProfileStackParamList = {
  ProfileScreen:     { userId?: string };
  EditProfileScreen: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0D0F1E' },
      }}
    >
      {/* No userId → own profile */}
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        initialParams={{ userId: undefined }}
      />
      <Stack.Screen
        name="EditProfileScreen"
        component={EditProfileScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
