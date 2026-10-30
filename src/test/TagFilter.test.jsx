import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TagFilter from '../components/TagFilter.jsx';

const tags = ['React', 'JavaScript', 'CSS', 'Java'];

describe('TagFilter', () => {
  it('renders all tags plus "All Tags" button', () => {
    render(<TagFilter tags={tags} activeTag={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'All Tags' })).toBeInTheDocument();
    tags.forEach((tag) => {
      expect(screen.getByRole('button', { name: tag })).toBeInTheDocument();
    });
  });

  it('renders tags in alphabetical order', () => {
    render(<TagFilter tags={['React', 'CSS', 'JavaScript']} activeTag={null} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole('button').filter(
      (b) => !['All Tags', 'Hide', 'Show'].includes(b.textContent)
    );
    expect(buttons.map((b) => b.textContent)).toEqual(['CSS', 'JavaScript', 'React']);
  });

  it('marks the active tag with is-active class', () => {
    render(<TagFilter tags={tags} activeTag="React" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'React' })).toHaveClass('is-active');
    expect(screen.getByRole('button', { name: 'All Tags' })).not.toHaveClass('is-active');
  });

  it('marks "All Tags" as active when activeTag is null', () => {
    render(<TagFilter tags={tags} activeTag={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'All Tags' })).toHaveClass('is-active');
  });

  it('calls onSelect with tag name when a tag is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TagFilter tags={tags} activeTag={null} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'React' }));
    expect(onSelect).toHaveBeenCalledWith('React');
  });

  it('calls onSelect with null when "All Tags" is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TagFilter tags={tags} activeTag="React" onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'All Tags' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('toggles tag list visibility when Show/Hide is clicked', async () => {
    const user = userEvent.setup();
    render(<TagFilter tags={tags} activeTag={null} onSelect={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: 'Hide' });
    expect(toggle).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();

    const chipLists = document.querySelectorAll('.tag-chip-list');
    const chipList = chipLists[chipLists.length - 1];
    expect(chipList).toHaveClass('is-collapsed');

    await user.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
    expect(chipList).not.toHaveClass('is-collapsed');
  });

  it('sets aria-expanded on the toggle button', async () => {
    const user = userEvent.setup();
    render(<TagFilter tags={tags} activeTag={null} onSelect={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: 'Hide' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('has accessible label', () => {
    render(<TagFilter tags={tags} activeTag={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('region', { name: /filter posts by tag/i })).toBeInTheDocument();
  });
});
