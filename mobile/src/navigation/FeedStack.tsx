import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeedScreen   from '../screens/main/FeedScreen';
import ProfileScreen, { FeedStackParamList as _FeedStackParamList }
  from '../screens/main/ProfileScreen';
import EditProfileScreen    from '../screens/main/EditProfileScreen';
import NotificationsScreen  from '../screens/main/NotificationsScreen';

// Re-export the param list so PostCard / other components can import it
export type FeedStackParamList = _FeedStackParamList & {
  EditProfileScreen:    undefined;
  NotificationsScreen:  undefined;
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

export default function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0F1E' } }}>
      <Stack.Screen name="FeedScreen"       component={FeedScreen} />
      <Stack.Screen name="ProfileScreen"    component={ProfileScreen} />
      <Stack.Screen name="EditProfileScreen"
        component={EditProfileScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="NotificationsScreen"
        component={NotificationsScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
