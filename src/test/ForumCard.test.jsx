import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ForumCard from '../components/ForumCard.jsx';

const mockAuthor = {
  id: 'u1',
  username: 'testuser',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.png',
  role: 'Developer',
};

const mockPost = {
  id: 'p1',
  authorId: 'u1',
  title: 'Test Post Title',
  content: 'This is a test post content with enough text to be an excerpt.',
  tags: ['React', 'JavaScript'],
  upvotes: 42,
  downvotes: 5,
  views: 1200,
  replies: 8,
  isSolved: false,
  isPinned: false,
  createdAt: '2026-08-05T09:12:00Z',
};

describe('ForumCard', () => {
  it('renders the post title as a link', () => {
    render(<ForumCard post={mockPost} author={mockAuthor} />);
    expect(screen.getByRole('link', { name: 'Test Post Title' })).toHaveAttribute(
      'href',
      '#/post/p1'
    );
  });

  it('renders the post excerpt', () => {
    render(<ForumCard post={mockPost} author={mockAuthor} />);
    expect(screen.getByText(/This is a test post content/)).toBeInTheDocument();
  });

  it('renders tags as links', () => {
    render(<ForumCard post={mockPost} author={mockAuthor} />);
    expect(screen.getByRole('link', { name: 'React' })).toHaveAttribute('href', '#/tag/React');
    expect(screen.getByRole('link', { name: 'JavaScript' })).toHaveAttribute(
      'href',
      '#/tag/JavaScript'
    );
  });

  it('renders vote counts', () => {
    render(<ForumCard post={mockPost} author={mockAuthor} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders author name and role', () => {
    render(<ForumCard post={mockPost} author={mockAuthor} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('renders views and replies', () => {
    render(<ForumCard post={mockPost} author={mockAuthor} />);
    expect(screen.getByText(/views/)).toBeInTheDocument();
    expect(screen.getByText('8 replies')).toBeInTheDocument();
  });

  it('does not show solved badge when post is not solved', () => {
    render(<ForumCard post={mockPost} author={mockAuthor} />);
    expect(screen.queryByText('Solved')).not.toBeInTheDocument();
  });

  it('shows solved badge when post is solved', () => {
    render(<ForumCard post={{ ...mockPost, isSolved: true }} author={mockAuthor} />);
    expect(screen.getByText('Solved')).toBeInTheDocument();
    expect(screen.getByText('Mark as Unsolved')).toBeInTheDocument();
  });

  it('shows pinned badge when post is pinned', () => {
    render(<ForumCard post={{ ...mockPost, isPinned: true }} author={mockAuthor} />);
    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('calls onVote when vote buttons are clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const onVote = vi.fn();
    render(<ForumCard post={mockPost} author={mockAuthor} onVote={onVote} />);

    await user.click(screen.getByRole('button', { name: /upvote/i }));
    expect(onVote).toHaveBeenCalledWith('up');
  });

  it('calls onToggleSolved when solve button is clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const onToggleSolved = vi.fn();
    render(<ForumCard post={mockPost} author={mockAuthor} onToggleSolved={onToggleSolved} />);

    await user.click(screen.getByRole('button', { name: /mark as solved/i }));
    expect(onToggleSolved).toHaveBeenCalledTimes(1);
  });

  it('renders the post link with correct href', () => {
    render(<ForumCard post={mockPost} author={mockAuthor} />);
    const link = screen.getByText('Test Post Title');
    expect(link.closest('a')).toHaveAttribute('href', '#/post/p1');
  });
});
