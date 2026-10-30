import { describe, it, expect, beforeEach } from 'vitest';
import { ForumApi, resetForumState } from '../services/forumApi.js';

beforeEach(() => {
  resetForumState();
});

describe('ForumApi.searchPosts - Advanced Search', () => {
  it('returns all posts when no filters are applied', async () => {
    const results = await ForumApi.searchPosts({});
    expect(results.length).toBeGreaterThan(0);
  });

  it('filters by keyword in title', async () => {
    const results = await ForumApi.searchPosts({ keyword: 'useEffect' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((p) => p.title.toLowerCase().includes('useeffect'))).toBe(true);
  });

  it('filters by keyword in content', async () => {
    const results = await ForumApi.searchPosts({ keyword: 'StrictMode' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((p) => p.content.toLowerCase().includes('strictmode'))).toBe(true);
  });

  it('filters by keyword in tags', async () => {
    const results = await ForumApi.searchPosts({ keyword: 'Docker' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(
      results.every((p) =>
        p.tags.some((t) => t.toLowerCase().includes('docker'))
      )
    ).toBe(true);
  });

  it('filters by exact tag', async () => {
    const results = await ForumApi.searchPosts({ tag: 'React' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((p) => p.tags.includes('React'))).toBe(true);
  });

  it('filters by tag case-insensitively', async () => {
    const results = await ForumApi.searchPosts({ tag: 'react' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((p) => p.tags.some((t) => t.toLowerCase() === 'react'))).toBe(true);
  });

  it('filters by author username', async () => {
    const results = await ForumApi.searchPosts({ author: 'alex_codes' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((p) => p.authorId === 'u1')).toBe(true);
  });

  it('filters by author display name', async () => {
    const results = await ForumApi.searchPosts({ author: 'Priya' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((p) => p.authorId === 'u2')).toBe(true);
  });

  it('filters by author case-insensitively', async () => {
    const results = await ForumApi.searchPosts({ author: 'ALEX' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((p) => p.authorId === 'u1')).toBe(true);
  });

  it('combines keyword and tag filters', async () => {
    const results = await ForumApi.searchPosts({ keyword: 'Spring', tag: 'Java' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(
      results.every(
        (p) =>
          p.tags.includes('Java') &&
          (p.title.toLowerCase().includes('spring') ||
            p.content.toLowerCase().includes('spring') ||
            p.tags.some((t) => t.toLowerCase().includes('spring')))
      )
    ).toBe(true);
  });

  it('combines keyword and author filters', async () => {
    const results = await ForumApi.searchPosts({ keyword: 'Spring', author: 'Sam' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(
      results.every(
        (p) =>
          p.authorId === 'u3' &&
          (p.title.toLowerCase().includes('spring') ||
            p.content.toLowerCase().includes('spring') ||
            p.tags.some((t) => t.toLowerCase().includes('spring')))
      )
    ).toBe(true);
  });

  it('returns empty array when no posts match', async () => {
    const results = await ForumApi.searchPosts({ keyword: 'nonexistentXYZ123' });
    expect(results).toEqual([]);
  });

  it('returns empty array when tag does not exist', async () => {
    const results = await ForumApi.searchPosts({ tag: 'NonexistentTag' });
    expect(results).toEqual([]);
  });

  it('returns empty array when author does not exist', async () => {
    const results = await ForumApi.searchPosts({ author: 'nobody_here' });
    expect(results).toEqual([]);
  });

  it('results are sorted by createdAt descending', async () => {
    const results = await ForumApi.searchPosts({});
    for (let i = 1; i < results.length; i++) {
      expect(new Date(results[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(results[i].createdAt).getTime()
      );
    }
  });

  it('returns deep-cloned data', async () => {
    const results = await ForumApi.searchPosts({ keyword: 'React' });
    const original = results[0];
    if (original) {
      original.title = 'MUTATED';
      const fresh = await ForumApi.searchPosts({ keyword: 'React' });
      expect(fresh[0].title).not.toBe('MUTATED');
    }
  });
});
