import { ImageSourcePropType } from 'react-native';

export type OnboardingSlide = {
  id: string;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Build Your Network',
    subtitle: 'Connect with students, seniors and mentors.',
    image: require('../../../../assets/onboarding/onboarding-1.png'),
  },
  {
    id: '2',
    title: 'Join Communities',
    subtitle: 'Find your tribe and learn together.',
    image: require('../../../../assets/onboarding/onboarding-2.png'),
  },
  {
    id: '3',
    title: 'Unlock Opportunities',
    subtitle: 'Discover internships and campus events.',
    image: require('../../../../assets/onboarding/onboarding-3.png'),
  },
];
