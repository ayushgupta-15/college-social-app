import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EventsScreen, { EventsStackParamList as _EventsStackParamList }
  from '../screens/main/EventsScreen';
import EventDetailScreen from '../screens/main/EventDetailScreen';

export type EventsStackParamList = _EventsStackParamList;

const Stack = createNativeStackNavigator<EventsStackParamList>();

export default function EventsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0D0F1E' },
      }}
    >
      <Stack.Screen name="EventsScreen"      component={EventsScreen} />
      <Stack.Screen name="EventDetailScreen" component={EventDetailScreen} />
    </Stack.Navigator>
  );
}
