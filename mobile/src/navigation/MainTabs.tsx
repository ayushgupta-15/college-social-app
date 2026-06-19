import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import FeedStack     from './FeedStack';
import GroupsStack   from './GroupsStack';
import EventsStack   from './EventsStack';
import MessagesStack from './MessagesStack';
import ProfileStack  from './ProfileStack';

export type MainTabParamList = {
  Feed:     undefined;
  Groups:   undefined;
  Events:   undefined;
  Messages: undefined;
  Profile:  undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, { active: string; inactive: string }> = {
  Feed:     { active: 'home',          inactive: 'home-outline' },
  Groups:   { active: 'people',        inactive: 'people-outline' },
  Events:   { active: 'calendar',      inactive: 'calendar-outline' },
  Messages: { active: 'chatbubbles',   inactive: 'chatbubbles-outline' },
  Profile:  { active: 'person-circle', inactive: 'person-circle-outline' },
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#13131F',
          borderTopColor: '#2A2A3D',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarActiveTintColor: '#5B8BFF',
        tabBarInactiveTintColor: '#666680',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icon = ICONS[route.name as keyof MainTabParamList];
          const name = focused ? icon.active : icon.inactive;
          return <Ionicons name={name as any} size={size} color={color} />;
        },
      })}
    >
      {/* FeedStack: FeedScreen → ProfileScreen → EditProfileScreen */}
      <Tab.Screen name="Feed" component={FeedStack} />

      {/* GroupsStack: GroupsScreen → GroupDetailScreen */}
      <Tab.Screen name="Groups" component={GroupsStack} />
      <Tab.Screen name="Events" component={EventsStack} />
      {/* MessagesStack: MessagesScreen → ChatScreen */}
      <Tab.Screen name="Messages" component={MessagesStack} />

      {/* ProfileStack: ProfileScreen (own) → EditProfileScreen */}
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
