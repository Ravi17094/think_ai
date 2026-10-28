export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits `text` into alternating matched / unmatched segments so the UI can
 * render the query term without dangerously injecting markup. Matching is
 * case-insensitive and ignores surrounding whitespace in the query.
 */
export function buildHighlightSegments(
  text: string,
  query: string
): HighlightSegment[] {
  const needle = query.trim();
  if (needle === '' || text === '') {
    return [{ text, isMatch: false }];
  }

  const pattern = new RegExp(escapeRegExp(needle), 'gi');
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  const matches = text.matchAll(pattern);
  for (const match of matches) {
    const index = match.index;
    if (index === undefined) {
      continue;
    }
    const matchedText = match[0];
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), isMatch: false });
    }
    segments.push({ text: matchedText, isMatch: true });
    cursor = index + matchedText.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatch: false });
  }

  return segments;
}

/** True when `text` contains every whitespace-separated term of `query`. */
export function matchesSearchTerms(text: string, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }
  const haystack = text.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
