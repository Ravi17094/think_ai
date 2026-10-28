/**
 * Tiny markdown subset used by the rich text preview (Pages 6 and 7).
 *
 * Supports what the formatting toolbar can insert: `**bold**`, `_italic_`,
 * `` `code` ``, `[label](url)`, headings and `-` bullets. Unknown syntax is
 * shown as plain text, so the preview can never throw on user input.
 */

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; value: string; href: string };

export interface MarkdownBlock {
  type: 'heading' | 'bullet' | 'paragraph';
  level?: number;
  tokens: InlineToken[];
}

const INLINE_PATTERN =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(_[^_]+_)|(\[[^\]]+\]\([^)\s]+\))/g;

export function parseInlineMarkdown(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  for (const match of input.matchAll(INLINE_PATTERN)) {
    const raw = match[0];
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ type: 'text', value: input.slice(cursor, index) });
    }

    if (raw.startsWith('`')) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) });
    } else if (raw.startsWith('**')) {
      tokens.push({ type: 'bold', value: raw.slice(2, -2) });
    } else if (raw.startsWith('_')) {
      tokens.push({ type: 'italic', value: raw.slice(1, -1) });
    } else {
      const separator = raw.indexOf('](');
      tokens.push({
        type: 'link',
        value: raw.slice(1, separator),
        href: raw.slice(separator + 2, -1),
      });
    }
    cursor = index + raw.length;
  }

  if (cursor < input.length) {
    tokens.push({ type: 'text', value: input.slice(cursor) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value: input }];
}

export function parseMarkdown(input: string): MarkdownBlock[] {
  return input.split('\n').reduce<MarkdownBlock[]>((blocks, line) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      return blocks;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1]?.length ?? 1,
        tokens: parseInlineMarkdown(heading[2] ?? ''),
      });
      return blocks;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      blocks.push({ type: 'bullet', tokens: parseInlineMarkdown(bullet[1] ?? '') });
      return blocks;
    }

    blocks.push({ type: 'paragraph', tokens: parseInlineMarkdown(trimmed) });
    return blocks;
  }, []);
}
