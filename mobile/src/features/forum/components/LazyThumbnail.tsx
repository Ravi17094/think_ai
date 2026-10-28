import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

export function LazyThumbnail({
  uri,
  accessibilityLabel,
}: {
  uri: string;
  /** When provided the image is announced; otherwise it is treated as decorative. */
  accessibilityLabel?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isDecorative = accessibilityLabel === undefined;

  return (
    <View style={styles.wrap} testID="lazy-thumbnail">
      {!error && (
        <Image
          accessibilityElementsHidden={isDecorative}
          accessibilityLabel={accessibilityLabel}
          accessible={!isDecorative}
          importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'auto'}
          source={{ uri }}
          style={styles.img}
          resizeMode="cover"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
      {error && (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.img, styles.error]}
          testID="lazy-thumbnail-error"
        />
      )}
      {loading && (
        <ActivityIndicator
          accessibilityLabel="Loading thumbnail"
          style={styles.loader}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 64, height: 48 },
  img: { width: 64, height: 48, borderRadius: 4 },
  error: { backgroundColor: '#f2a7a7' },
  loader: { position: 'absolute', top: 12, left: 22 },
});
