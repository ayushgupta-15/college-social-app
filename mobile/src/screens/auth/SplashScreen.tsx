import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }: Props) {
  // ── Animated values ────────────────────────────────────────────────────────
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoScale     = useRef(new Animated.Value(0.75)).current;
  const textOpacity   = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const ringScale1    = useRef(new Animated.Value(0.6)).current;
  const ringOpacity1  = useRef(new Animated.Value(0)).current;
  const ringScale2    = useRef(new Animated.Value(0.6)).current;
  const ringOpacity2  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stage 1 — rings pulse in
    Animated.parallel([
      Animated.timing(ringOpacity1, {
        toValue: 0.35,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(ringScale1, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity2, {
        toValue: 0.2,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(ringScale2, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 2 — logo fades + scales in
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Stage 3 — text fades in after logo
    Animated.sequence([
      Animated.delay(700),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 4 — tagline
    Animated.sequence([
      Animated.delay(1000),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after 2.4s — use replace so back button never returns here
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />

      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.ring,
          styles.ringOuter,
          { opacity: ringOpacity2, transform: [{ scale: ringScale2 }] },
        ]}
      />

      {/* Inner glow ring */}
      <Animated.View
        style={[
          styles.ring,
          styles.ringInner,
          { opacity: ringOpacity1, transform: [{ scale: ringScale1 }] },
        ]}
      />

      {/* Logo circle */}
      <Animated.View
        style={[
          styles.logoWrapper,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.logoBg}>
          <Text style={styles.logoLetter}>C</Text>
        </View>
      </Animated.View>

      {/* App name */}
      <Animated.Text style={[styles.appName, { opacity: textOpacity }]}>
        Campus Connect
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Connect. Learn. Grow.
      </Animated.Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by React Native  •  v1.0.0</Text>
      </View>
    </View>
  );
}

const LOGO_SIZE   = 120;
const RING_INNER  = 200;
const RING_OUTER  = 280;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Rings ──────────────────────────────────────────────────────────────────
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  ringInner: {
    width: RING_INNER,
    height: RING_INNER,
    borderColor: '#7C6FE0',
  },
  ringOuter: {
    width: RING_OUTER,
    height: RING_OUTER,
    borderColor: '#4B8BFF',
  },

  // ── Logo ───────────────────────────────────────────────────────────────────
  logoWrapper: {
    marginBottom: 32,
  },
  logoBg: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: 'rgba(124, 111, 224, 0.15)',
    borderWidth: 2,
    borderColor: '#7C6FE0',
    alignItems: 'center',
    justifyContent: 'center',
    // glow effect via shadow
    shadowColor: '#7C6FE0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 20,
  },
  logoLetter: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },

  // ── Text ───────────────────────────────────────────────────────────────────
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#8888AA',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#44445A',
    letterSpacing: 0.3,
  },
});
