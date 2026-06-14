import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Placeholder used for every screen that isn't implemented yet.
// Replace the body with real content sprint by sprint.
interface Props {
  name: string;
}

export default function PlaceholderScreen({ name }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{name}</Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F0F1A',
  },
  label: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
});
