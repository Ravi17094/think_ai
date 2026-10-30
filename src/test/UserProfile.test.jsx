import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserProfile from '../components/UserProfile.jsx';

const mockUser = {
  id: 'u1',
  username: 'testuser',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.png',
  role: 'Developer',
};

describe('UserProfile', () => {
  it('renders the user display name', () => {
    render(<UserProfile user={mockUser} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders the user role', () => {
    render(<UserProfile user={mockUser} />);
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('renders the avatar image with correct alt text', () => {
    render(<UserProfile user={mockUser} />);
    expect(screen.getByRole('img', { name: 'Test User avatar' })).toHaveAttribute(
      'src',
      'https://example.com/avatar.png'
    );
  });

  it('links to the user profile page', () => {
    render(<UserProfile user={mockUser} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '#/user/testuser');
  });

  it('renders nothing when user is null', () => {
    const { container } = render(<UserProfile user={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('has correct avatar dimensions', () => {
    render(<UserProfile user={mockUser} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', '36');
    expect(img).toHaveAttribute('height', '36');
  });
});
