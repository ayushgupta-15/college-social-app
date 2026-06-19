import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { ONBOARDING_SLIDES, OnboardingSlide } from './onboarding/onboardingData';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BG = '#070B19';
const ACCENT = '#0084FF';
const SUBTEXT = '#D3DAEA';
const DOT_INACTIVE = '#3A4158';
const ARTWORK_VERTICAL_OFFSET = -26;
const CONTENT_BOTTOM_OFFSET = 34;

function PaginationDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            index === activeIndex ? styles.dotActive : styles.dotInactive,
            index > 0 && styles.dotSpacing,
          ]}
        />
      ))}
    </View>
  );
}

function OnboardingSlideView({ item }: { item: OnboardingSlide }) {
  return (
    <View style={styles.slide}>
      <ImageBackground source={item.image} style={styles.backgroundImage} resizeMode="cover" />
    </View>
  );
}

export default function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLastSlide = activeIndex === ONBOARDING_SLIDES.length - 1;
  const activeSlide = ONBOARDING_SLIDES[activeIndex];

  const goToLogin = useCallback(() => {
    navigation.replace('Login');
  }, [navigation]);

  const goNext = useCallback(() => {
    if (isLastSlide) {
      goToLogin();
      return;
    }
    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  }, [activeIndex, goToLogin, isLastSlide]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setActiveIndex(index);
    },
    [],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OnboardingSlideView item={item} />}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(7,11,25,0.08)', 'rgba(7,11,25,0.2)', 'rgba(7,11,25,0.96)']}
        locations={[0, 0.46, 1]}
        style={styles.readabilityOverlay}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{activeSlide.title}</Text>
          <Text style={styles.subtitle}>{activeSlide.subtitle}</Text>
        </View>

        {isLastSlide ? (
          <View style={styles.lastActions}>
            <Pressable
              style={({ pressed }) => [styles.getStartedBtn, pressed && styles.btnPressed]}
              onPress={goToLogin}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <PaginationDots count={ONBOARDING_SLIDES.length} activeIndex={activeIndex} />

            <View style={styles.navRow}>
              <Pressable
                style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}
                onPress={goToLogin}
                hitSlop={12}
              >
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.nextBtn, pressed && styles.btnPressed]}
                onPress={goNext}
              >
                <Text style={styles.nextText}>Next</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <View style={[styles.homeBar, { bottom: Math.max(insets.bottom - 6, 6) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    marginTop: ARTWORK_VERTICAL_OFFSET,
    marginBottom: -ARTWORK_VERTICAL_OFFSET,
  },

  readabilityOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 26,
    marginBottom: 22,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: SUBTEXT,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: CONTENT_BOTTOM_OFFSET,
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginTop: 20,
  },

  skipBtn: {
    minWidth: 52,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    color: SUBTEXT,
  },

  nextBtn: {
    backgroundColor: ACCENT,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    minWidth: 96,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  lastActions: {
    paddingTop: 4,
  },
  getStartedBtn: {
    backgroundColor: ACCENT,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  btnPressed: {
    opacity: 0.85,
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  dotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DOT_INACTIVE,
  },
  dotSpacing: {
    marginLeft: 8,
  },

  homeBar: {
    position: 'absolute',
    alignSelf: 'center',
    width: 134,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2.5,
  },
});
