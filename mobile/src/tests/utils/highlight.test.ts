import {
  buildHighlightSegments,
  matchesSearchTerms,
} from '@/utils/highlight';

describe('buildHighlightSegments', () => {
  it('returns a single non-match segment for an empty query', () => {
    expect(buildHighlightSegments('React Native', '')).toEqual([
      { text: 'React Native', isMatch: false },
    ]);
  });

  it('splits text around a single match', () => {
    expect(buildHighlightSegments('React Native Mastery', 'Native')).toEqual([
      { text: 'React ', isMatch: false },
      { text: 'Native', isMatch: true },
      { text: ' Mastery', isMatch: false },
    ]);
  });

  it('matches case-insensitively but preserves the original casing', () => {
    expect(buildHighlightSegments('Deep dive into useEffect', 'useeffect')).toEqual([
      { text: 'Deep dive into ', isMatch: false },
      { text: 'useEffect', isMatch: true },
    ]);
  });

  it('marks every occurrence, not just the first', () => {
    const segments = buildHighlightSegments('aXbXc', 'x');
    expect(segments.filter((s) => s.isMatch)).toHaveLength(2);
    expect(segments.map((s) => s.text).join('')).toBe('aXbXc');
  });

  it('treats regex metacharacters as literal characters', () => {
    expect(buildHighlightSegments('Price is $100 today', '$1')).toEqual([
      { text: 'Price is ', isMatch: false },
      { text: '$1', isMatch: true },
      { text: '00 today', isMatch: false },
    ]);
  });

  it('handles a metacharacter sequence without exploding', () => {
    expect(buildHighlightSegments('Use () for grouping', '()')).toEqual([
      { text: 'Use ', isMatch: false },
      { text: '()', isMatch: true },
      { text: ' for grouping', isMatch: false },
    ]);
  });

  it('returns no match when the term is absent', () => {
    expect(buildHighlightSegments('React Native', 'GraphQL')).toEqual([
      { text: 'React Native', isMatch: false },
    ]);
  });

  it('handles a match at the start and end of the string', () => {
    expect(buildHighlightSegments('React Native', 'React')).toEqual([
      { text: 'React', isMatch: true },
      { text: ' Native', isMatch: false },
    ]);
  });

  it('handles empty input text', () => {
    expect(buildHighlightSegments('', 'react')).toEqual([
      { text: '', isMatch: false },
    ]);
  });
});

describe('matchesSearchTerms', () => {
  it('requires every whitespace-separated term to be present', () => {
    expect(matchesSearchTerms('React Native Mastery', 'react native')).toBe(true);
    expect(matchesSearchTerms('React Native Mastery', 'native vue')).toBe(false);
  });

  it('treats a blank query as a match', () => {
    expect(matchesSearchTerms('anything', '   ')).toBe(true);
  });
});
