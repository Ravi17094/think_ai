import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {spacing, typography} from '@/theme/tokens';
import type { Palette } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

const slides: Slide[] = [
  {
    id: 'learn',
    title: 'Learn',
    description: 'Access high-quality courses and learn at your own pace',
    emoji: '📚',
  },
  {
    id: 'connect',
    title: 'Connect',
    description: 'Engage with peers and instructors in the community forum',
    emoji: '🤝',
  },
  {
    id: 'achieve',
    title: 'Achieve',
    description: 'Track your progress and earn certificates',
    emoji: '🏆',
  },
];

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

function getItemLayout(
  _data: ArrayLike<Slide> | null | undefined,
  index: number
) {
  return { length: width, offset: width * index, index };
}

export function WelcomeCarouselScreen({ onComplete, onSkip }: Props) {
  const styles = useThemedStyles(createStyles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const firstVisible = viewableItems[0];
      if (firstVisible && firstVisible.index !== null) {
        setCurrentIndex(firstVisible.index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex });
    } else {
      onComplete();
    }
  }, [currentIndex, onComplete]);

  const renderSlide = useCallback(({ item }: { item: Slide }) => {
    return (
      <View style={styles.slide} testID={`welcome-slide-${item.id}`}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  }, [styles]);

  return (
    <SafeAreaView style={styles.safeArea} testID="welcome-carousel">
      <View style={styles.header}>
        <Pressable
          onPress={onSkip}
          testID="welcome-skip"
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        testID="welcome-carousel-list"
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <Pressable
          style={styles.nextButton}
          onPress={handleNext}
          testID="welcome-next"
          accessibilityRole="button"
          accessibilityLabel={currentIndex === slides.length - 1 ? 'Get started' : 'Next'}>
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skipText: {
    ...typography.label,
    color: palette.brand,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.display,
    color: palette.textPrimary,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: palette.brand,
    width: 24,
  },
  dotInactive: {
    backgroundColor: palette.border,
  },
  nextButton: {
    backgroundColor: palette.brand,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    ...typography.label,
    color: palette.textInverse,
  },
});

export default WelcomeCarouselScreen;
