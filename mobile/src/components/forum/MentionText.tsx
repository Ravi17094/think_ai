import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { palette, typography } from '@/theme/tokens';

export interface MentionTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  testID?: string;
}

/** Body renderer that highlights `@mentions` the way the web thread view does. */
export function MentionText({ text, style, numberOfLines, testID }: MentionTextProps) {
  const parts = text.split(/(@[A-Za-z0-9_]+)/g);

  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, style]} testID={testID}>
      {parts.map((part, index) =>
        part.startsWith('@') && part.length > 1 ? (
          <Text key={index} style={styles.mention}>
            {part}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    color: palette.textPrimary,
  },
  mention: {
    color: palette.brand,
    fontWeight: '600',
  },
});

export default MentionText;
