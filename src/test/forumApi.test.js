import { describe, it, expect, beforeEach } from 'vitest';
import { ForumApi, getUserVote, getAllUserVotes, resetForumState } from '../services/forumApi.js';

beforeEach(() => {
  resetForumState();
  window.localStorage.clear();
});

describe('ForumApi vote persistence', () => {
  it('increments upvotes on up vote', async () => {
    const post = await ForumApi.getPostById('p1');
    const originalUpvotes = post.upvotes;

    const updated = await ForumApi.votePost('p1', 'up');
    expect(updated.upvotes).toBe(originalUpvotes + 1);
  });

  it('increments downvotes on down vote', async () => {
    const post = await ForumApi.getPostById('p1');
    const originalDownvotes = post.downvotes;

    const updated = await ForumApi.votePost('p1', 'down');
    expect(updated.downvotes).toBe(originalDownvotes + 1);
  });

  it('toggles off when voting same direction twice', async () => {
    const post = await ForumApi.getPostById('p1');
    const originalUpvotes = post.upvotes;

    await ForumApi.votePost('p1', 'up');
    const toggled = await ForumApi.votePost('p1', 'up');
    expect(toggled.upvotes).toBe(originalUpvotes);
  });

  it('switches vote direction when changing vote', async () => {
    const post = await ForumApi.getPostById('p1');
    const originalUp = post.upvotes;
    const originalDown = post.downvotes;

    await ForumApi.votePost('p1', 'up');
    const switched = await ForumApi.votePost('p1', 'down');
    expect(switched.upvotes).toBe(originalUp);
    expect(switched.downvotes).toBe(originalDown + 1);
  });

  it('persists vote in localStorage', async () => {
    await ForumApi.votePost('p1', 'up');
    expect(getUserVote('p1')).toBe('up');

    const votes = getAllUserVotes();
    expect(votes.p1).toBe('up');
  });

  it('vote persists after reload (resetForumState preserves localStorage)', async () => {
    await ForumApi.votePost('p1', 'up');
    const votesAfterVote = getAllUserVotes();
    expect(votesAfterVote.p1).toBe('up');

    resetForumState();

    const votesAfterReset = getAllUserVotes();
    expect(votesAfterReset.p1).toBe('up');
  });
});

describe('ForumApi toggled solved persistence', () => {
  it('toggles solved status', async () => {
    const post = await ForumApi.getPostById('p1');
    expect(post.isSolved).toBe(false);

    const toggled = await ForumApi.toggleSolved('p1');
    expect(toggled.isSolved).toBe(true);

    const toggledBack = await ForumApi.toggleSolved('p1');
    expect(toggledBack.isSolved).toBe(false);
  });
});

describe('ForumApi edge cases', () => {
  it('throws on invalid vote direction', async () => {
    await expect(ForumApi.votePost('p1', 'invalid')).rejects.toThrow(
      'direction must be "up" or "down"'
    );
  });

  it('throws on non-existent post', async () => {
    await expect(ForumApi.votePost('p999', 'up')).rejects.toThrow('Post p999 not found');
  });
});
