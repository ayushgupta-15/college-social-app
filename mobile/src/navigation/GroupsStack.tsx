import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GroupsScreen, { GroupsStackParamList as _GroupsStackParamList }
  from '../screens/main/GroupsScreen';
import GroupDetailScreen from '../screens/main/GroupDetailScreen';

export type GroupsStackParamList = _GroupsStackParamList;

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export default function GroupsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0D0F1E' },
      }}
    >
      <Stack.Screen name="GroupsScreen"     component={GroupsScreen} />
      <Stack.Screen name="GroupDetailScreen" component={GroupDetailScreen} />
    </Stack.Navigator>
  );
}
