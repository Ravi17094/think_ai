import { describe, it, expect } from 'vitest';
import { parseHashRoute } from '../services/router.js';

describe('parseHashRoute', () => {
  it('returns forum route for empty hash', () => {
    expect(parseHashRoute('')).toEqual({ name: 'forum', params: {} });
  });

  it('returns forum route for "/"', () => {
    expect(parseHashRoute('#/')).toEqual({ name: 'forum', params: {} });
  });

  it('parses post route', () => {
    expect(parseHashRoute('#/post/p1')).toEqual({ name: 'post', params: { id: 'p1' } });
  });

  it('parses tag route', () => {
    expect(parseHashRoute('#/tag/React')).toEqual({
      name: 'tag',
      params: { tag: 'React' },
    });
  });

  it('parses tag route with encoded characters', () => {
    expect(parseHashRoute('#/tag/REST%20API')).toEqual({
      name: 'tag',
      params: { tag: 'REST API' },
    });
  });

  it('parses user route', () => {
    expect(parseHashRoute('#/user/alex_codes')).toEqual({
      name: 'user',
      params: { username: 'alex_codes' },
    });
  });

  it('parses new discussion route', () => {
    expect(parseHashRoute('#/new')).toEqual({ name: 'new', params: {} });
  });

  it('returns forum route for unknown paths', () => {
    expect(parseHashRoute('#/unknown/path')).toEqual({ name: 'forum', params: {} });
  });
});
