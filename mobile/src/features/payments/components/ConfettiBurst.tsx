import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export function ConfettiBurst() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    Animated.timing(scale, { toValue: 1.1, duration: 900, useNativeDriver: true }).start();
  }, [opacity, scale]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.container,
        { opacity, transform: [{ scale }] },
      ]}
      testID="confetti-burst"
    >
      <View style={styles.particle1} />
      <View style={styles.particle2} />
      <View style={styles.particle3} />
      <View style={styles.particle4} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 200,
    height: 60,
    marginBottom: 16,
  },
  particle1: {
    width: 8,
    height: 20,
    backgroundColor: '#ffeb3b',
    transform: [{ rotate: '45deg' }],
  },
  particle2: {
    width: 8,
    height: 20,
    backgroundColor: '#f44336',
    transform: [{ rotate: '-45deg' }],
  },
  particle3: {
    width: 8,
    height: 20,
    backgroundColor: '#2196f3',
    transform: [{ rotate: '30deg' }],
  },
  particle4: {
    width: 8,
    height: 20,
    backgroundColor: '#4caf50',
    transform: [{ rotate: '-30deg' }],
  },
});
