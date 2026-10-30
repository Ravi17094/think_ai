import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommunityForum from '../pages/CommunityForum.jsx';

vi.mock('../services/forumApi.js', () => ({
  ForumApi: {
    getPosts: vi.fn(),
    getUsers: vi.fn(),
    getTags: vi.fn(),
    votePost: vi.fn(),
    toggleSolved: vi.fn(),
  },
  getAllUserVotes: vi.fn(() => ({})),
}));

import { ForumApi } from '../services/forumApi.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CommunityForum — Empty States', () => {
  it('shows empty state when there are no posts', async () => {
    ForumApi.getPosts.mockResolvedValue([]);
    ForumApi.getUsers.mockResolvedValue([]);
    ForumApi.getTags.mockResolvedValue([]);

    render(<CommunityForum />);

    await waitFor(() => {
      expect(screen.getByText('No discussions yet.')).toBeInTheDocument();
    });
    expect(screen.getByText('Be the first to start a conversation.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ask a Question' })).toHaveAttribute('href', '#/new');
  });

  it('shows filtered empty state when no posts match', async () => {
    ForumApi.getPosts.mockResolvedValue([
      {
        id: 'p1',
        authorId: 'u1',
        title: 'Java question',
        content: 'Some Java content',
        tags: ['Java'],
        upvotes: 5,
        downvotes: 0,
        views: 100,
        replies: 2,
        isSolved: false,
        isPinned: false,
        createdAt: '2026-08-05T09:12:00Z',
      },
    ]);
    ForumApi.getUsers.mockResolvedValue([]);
    ForumApi.getTags.mockResolvedValue(['Java']);

    render(<CommunityForum initialTag="React" />);

    await waitFor(() => {
      expect(screen.getByText('No posts match your filters.')).toBeInTheDocument();
    });
    expect(screen.getByText('Try clearing the tag or search query.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
  });
});

describe('CommunityForum — Renders posts', () => {
  it('renders a list of posts after loading', async () => {
    ForumApi.getPosts.mockResolvedValue([
      {
        id: 'p1',
        authorId: 'u1',
        title: 'First post',
        content: 'Content of first post',
        tags: ['React'],
        upvotes: 10,
        downvotes: 1,
        views: 200,
        replies: 3,
        isSolved: false,
        isPinned: false,
        createdAt: '2026-08-05T09:12:00Z',
      },
      {
        id: 'p2',
        authorId: 'u2',
        title: 'Second post',
        content: 'Content of second post',
        tags: ['Java'],
        upvotes: 5,
        downvotes: 0,
        views: 100,
        replies: 1,
        isSolved: true,
        isPinned: false,
        createdAt: '2026-08-04T10:00:00Z',
      },
    ]);
    ForumApi.getUsers.mockResolvedValue([
      { id: 'u1', username: 'alice', displayName: 'Alice', avatar: '', role: 'Dev' },
      { id: 'u2', username: 'bob', displayName: 'Bob', avatar: '', role: 'Dev' },
    ]);
    ForumApi.getTags.mockResolvedValue(['React', 'Java']);

    render(<CommunityForum />);

    await waitFor(() => {
      expect(screen.getByText('2 posts')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'First post' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Second post' })).toBeInTheDocument();
  });

  it('shows search input and tag filter', async () => {
    ForumApi.getPosts.mockResolvedValue([]);
    ForumApi.getUsers.mockResolvedValue([]);
    ForumApi.getTags.mockResolvedValue(['React']);

    render(<CommunityForum />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by keyword/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'All Tags' })).toBeInTheDocument();
  });
});
