import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import ProfileSetupStack from './ProfileSetupStack';

// RootNavigator is the single decision point for the entire app flow.
// It reads `token` from AuthContext — the source of truth for auth state.
//
//   token = null  → AuthStack  (Splash → Login / Signup)
//   token exists  → MainTabs   (Feed, Groups, Events, Messages, Profile)
//
// isLoading covers the brief boot period while SecureStore is read.
// During that window we show a neutral spinner so the user never sees a flash
// of the wrong navigator.

export default function RootNavigator() {
  const { token, user, isLoading } = useAuth();

  // If we have a token (user logged in) but their profile doesn't have college or major,
  // we block navigation to MainTabs and force them to complete their profile.
  const isProfileIncomplete = token && (!user?.college || !user?.major);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0F1A' }}>
        <ActivityIndicator size="large" color="#7C6FE0" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? (
        isProfileIncomplete ? <ProfileSetupStack /> : <MainTabs />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
