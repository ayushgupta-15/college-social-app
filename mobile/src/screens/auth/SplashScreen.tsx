import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const { width } = Dimensions.get('window');
const LOGO_CONTAINER = width;
const RING_CENTER_X = LOGO_CONTAINER / 2;
const RING_CENTER_Y = LOGO_CONTAINER / 2 - 6;
const LOGO_SIZE = width * 0.52;

// ── Pre-load assets ───────────────────────────────────────────────────────────
const LOGO_IMG = require('../../../assets/logo.png');

// min(rx, ry) must clear logo + text; max(rx, ry) must fit within screen half-width
const ORBITAL_RINGS = [
  { rx: 172, ry: 142, rotation: 15,  color: '#00F0FF' },
  { rx: 178, ry: 145, rotation: 75,  color: '#8A2BE2' },
  { rx: 168, ry: 138, rotation: -35, color: '#FF00FF' },
  { rx: 176, ry: 135, rotation: 135, color: '#4169E1' },
  { rx: 170, ry: 143, rotation: -80, color: '#9D00FF' },
  { rx: 174, ry: 140, rotation: 45,  color: '#00D4FF' },
  { rx: 177, ry: 141, rotation: -120, color: '#B040FF' },
];

const MAX_RING_RADIUS = Math.max(
  ...ORBITAL_RINGS.map((r) => Math.max(r.rx, r.ry)),
);
const RING_EDGE_PADDING = 20;
const RING_DRAW_SCALE = Math.min(
  1,
  (width / 2 - RING_EDGE_PADDING) / MAX_RING_RADIUS,
);

// ── Static star positions ─────────────────────────────────────────────────────
const STARS = [
  { top: '12%',  left:  '18%', op: 0.40, color: '#ffffff' },
  { top: '22%',  right: '14%', op: 0.60, color: '#00f2fe' },
  { top: '08%',  right: '30%', op: 0.35, color: '#4facfe' },
  { top: '40%',  left:  '06%', op: 0.45, color: '#ffffff' },
  { top: '55%',  right: '08%', op: 0.50, color: '#00f2fe' },
  { bottom:'30%',left:  '10%', op: 0.30, color: '#4facfe' },
  { bottom:'38%',right: '22%', op: 0.50, color: '#00f2fe' },
  { bottom:'18%',left:  '30%', op: 0.35, color: '#ffffff' },
  { bottom:'25%',right: '40%', op: 0.40, color: '#4facfe' },
  { top: '70%',  left:  '85%', op: 0.55, color: '#ffffff' },
];

export default function SplashScreen({ navigation }: Props) {
  // ── Animated values ─────────────────────────────────────────────────────────
  const bgOpacity    = useRef(new Animated.Value(0)).current;
  const ringsOpacity = useRef(new Animated.Value(0)).current;
  const ringsScale   = useRef(new Animated.Value(0.82)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.75)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textSlide    = useRef(new Animated.Value(14)).current;
  const starsOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity= useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 0 — background fades in
    Animated.timing(bgOpacity, {
      toValue: 1, duration: 600,
      easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();

    // 1 — star particles
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(starsOpacity, {
        toValue: 1, duration: 1000, useNativeDriver: true,
      }),
    ]).start();

    // 2 — orbital rings scale + fade in (slow, cinematic)
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(ringsOpacity, {
          toValue: 1, duration: 1400,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(ringsScale, {
          toValue: 1, duration: 1600,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3 — C logo fades + scales in after rings
    Animated.sequence([
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 1000,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1, duration: 1100,
          easing: Easing.out(Easing.back(1.05)), useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 4 — "Campus Connect" text slides up
    Animated.sequence([
      Animated.delay(1100),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1, duration: 900,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(textSlide, {
          toValue: 0, duration: 900,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 5 — footer last
    Animated.sequence([
      Animated.delay(1600),
      Animated.timing(footerOpacity, {
        toValue: 1, duration: 800, useNativeDriver: true,
      }),
    ]).start();

    // Navigate after 3.4 s
    const timer = setTimeout(() => navigation.replace('Onboarding'), 3400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B19" translucent />

      {/* ── Star particles ────────────────────────────────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: starsOpacity }]}>
        {STARS.map((s, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                top:    s.top    as any,
                bottom: s.bottom as any,
                left:   s.left   as any,
                right:  s.right  as any,
                opacity: s.op,
                backgroundColor: s.color,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* ── Main logo stack ───────────────────────────────────────────── */}
      <View style={styles.logoContainer}>

        {/* Orbital rings — SVG ellipses */}
        <Animated.View
          style={[
            styles.orbitalRings,
            { opacity: ringsOpacity, transform: [{ scale: ringsScale }] },
          ]}
          pointerEvents="none"
        >
          <Svg
            width={LOGO_CONTAINER}
            height={LOGO_CONTAINER}
            viewBox={`0 0 ${LOGO_CONTAINER} ${LOGO_CONTAINER}`}
          >
            {ORBITAL_RINGS.map((ring, index) => {
              const rx = ring.rx * RING_DRAW_SCALE;
              const ry = ring.ry * RING_DRAW_SCALE;
              return (
                <Ellipse
                  key={`ring-${index}`}
                  cx={RING_CENTER_X}
                  cy={RING_CENTER_Y}
                  rx={rx}
                  ry={ry}
                  stroke={ring.color}
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0.8}
                  transform={`rotate(${ring.rotation} ${RING_CENTER_X} ${RING_CENTER_Y})`}
                />
              );
            })}
          </Svg>
        </Animated.View>

        {/* Campus C logo + brand — above rings */}
        <View style={styles.contentCluster}>
          <Animated.Image
            source={LOGO_IMG}
            style={[
              styles.logoIcon,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}
            resizeMode="contain"
          />

          <Animated.Text
            style={[
              styles.brandText,
              {
                opacity: textOpacity,
                transform: [{ translateY: textSlide }],
              },
            ]}
          >
            Campus Connect
          </Animated.Text>
        </View>
      </View>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <Text style={styles.footerLine}>Powered by React Native</Text>
        <Text style={styles.footerLine}>v1.0.2026</Text>
      </Animated.View>

      {/* Home indicator bar */}
      <View style={styles.homeBar} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B19',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Stars ──────────────────────────────────────────────────────────────
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },

  // ── Logo stack ─────────────────────────────────────────────────────────
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width:  LOGO_CONTAINER,
    height: LOGO_CONTAINER,
  },
  orbitalRings: {
    position: 'absolute',
    width:  '100%',
    height: '100%',
    zIndex: 1,
  },
  contentCluster: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoIcon: {
    width: LOGO_SIZE,
    height: LOGO_SIZE * 0.88,
    marginBottom: 2,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    marginTop: -2,
  },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  footerLine: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 0.2,
  },

  // Home indicator
  homeBar: {
    position: 'absolute',
    bottom: 8,
    width: 134,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2.5,
  },
});