import { Linking, StyleSheet, Text, View } from 'react-native';

import { palette, spacing, typography } from '@/theme/tokens';
import { parseMarkdown, type InlineToken } from '@/utils/markdown';

export interface MarkdownPreviewProps {
  value: string;
  testID?: string;
}

function InlineText({ tokens }: { tokens: InlineToken[] }) {
  return (
    <Text>
      {tokens.map((token, index) => {
        switch (token.type) {
          case 'bold':
            return (
              <Text key={index} style={styles.bold}>
                {token.value}
              </Text>
            );
          case 'italic':
            return (
              <Text key={index} style={styles.italic}>
                {token.value}
              </Text>
            );
          case 'code':
            return (
              <Text key={index} style={styles.code}>
                {token.value}
              </Text>
            );
          case 'link':
            return (
              <Text
                key={index}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(token.href)}
                style={styles.link}>
                {token.value}
              </Text>
            );
          default:
            return <Text key={index}>{token.value}</Text>;
        }
      })}
    </Text>
  );
}

/**
 * Rendered preview of the markdown subset the toolbar can insert. Same
 * contract as the web editor's escaped renderer: unknown syntax shows as
 * plain text and can never throw.
 */
export function MarkdownPreview({ value, testID = 'markdown-preview' }: MarkdownPreviewProps) {
  const blocks = parseMarkdown(value);

  if (blocks.length === 0) {
    return (
      <Text style={styles.empty} testID={`${testID}-empty`}>
        Nothing to preview yet.
      </Text>
    );
  }

  return (
    <View testID={testID}>
      {blocks.map((block, index) => {
        if (block.type === 'bullet') {
          return (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bulletMark}>•</Text>
              <View style={styles.bulletBody}>
                <InlineText tokens={block.tokens} />
              </View>
            </View>
          );
        }

        return (
          <View key={index} style={styles.block}>
            <Text
              style={[
                styles.paragraph,
                block.type === 'heading' && styles.heading,
                block.level !== undefined && block.level <= 2 && styles.heading,
              ]}>
              <InlineText tokens={block.tokens} />
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: spacing.xs,
  },
  paragraph: {
    ...typography.body,
    color: palette.textPrimary,
  },
  heading: {
    ...typography.subtitle,
    color: palette.textPrimary,
    marginTop: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing.xxs,
  },
  bulletMark: {
    ...typography.body,
    color: palette.textSecondary,
    marginRight: spacing.xs,
  },
  bulletBody: {
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    ...typography.mono,
    backgroundColor: palette.surfaceMuted,
    color: palette.accent,
    borderRadius: 4,
    paddingHorizontal: spacing.xxs,
  },
  link: {
    color: palette.info,
    textDecorationLine: 'underline',
  },
  empty: {
    ...typography.body,
    color: palette.textMuted,
    fontStyle: 'italic',
  },
});

export default MarkdownPreview;
