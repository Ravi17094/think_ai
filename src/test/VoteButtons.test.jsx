import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import VoteButtons from '../components/VoteButtons.jsx';

describe('VoteButtons', () => {
  it('renders upvote and downvote counts', () => {
    render(<VoteButtons upvotes={10} downvotes={3} onVote={vi.fn()} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onVote("up") when upvote is clicked', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    render(<VoteButtons upvotes={5} downvotes={1} onVote={onVote} />);

    await user.click(screen.getByRole('button', { name: /upvote/i }));
    expect(onVote).toHaveBeenCalledWith('up');
  });

  it('calls onVote("down") when downvote is clicked', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    render(<VoteButtons upvotes={5} downvotes={1} onVote={onVote} />);

    await user.click(screen.getByRole('button', { name: /downvote/i }));
    expect(onVote).toHaveBeenCalledWith('down');
  });

  it('disables buttons when disabled prop is true', () => {
    render(<VoteButtons upvotes={5} downvotes={1} onVote={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: /upvote/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /downvote/i })).toBeDisabled();
  });

  it('applies active class for upvote when userVote is "up"', () => {
    render(<VoteButtons upvotes={5} downvotes={1} onVote={vi.fn()} userVote="up" />);
    expect(screen.getByRole('button', { name: /upvote/i })).toHaveClass('is-active');
    expect(screen.getByRole('button', { name: /downvote/i })).not.toHaveClass('is-active');
  });

  it('applies active class for downvote when userVote is "down"', () => {
    render(<VoteButtons upvotes={5} downvotes={1} onVote={vi.fn()} userVote="down" />);
    expect(screen.getByRole('button', { name: /downvote/i })).toHaveClass('is-active');
    expect(screen.getByRole('button', { name: /upvote/i })).not.toHaveClass('is-active');
  });

  it('has correct aria-pressed attributes', () => {
    render(<VoteButtons upvotes={5} downvotes={1} onVote={vi.fn()} userVote="up" />);
    expect(screen.getByRole('button', { name: /upvote/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /downvote/i })).toHaveAttribute('aria-pressed', 'false');
  });
});
