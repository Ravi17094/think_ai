import { DEFAULT_USER_ID } from '@/api/session';

/**
 * Learner identity shown on the Profile tab.
 *
 * The LMS session only stores an opaque user id (or the email used at sign-in),
 * so this module derives a stable, human-readable profile without inventing a
 * second backend contract. When the LMS profile endpoint lands, replace this
 * function with an API call — the screen only depends on `LearnerProfile`.
 */
export interface LearnerProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  batch: string;
  joinedAt: string;
  location: string;
  initials: string;
}

function titleCase(value: string): string {
  return value.length === 0
    ? value
    : value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? 'T';
  const second = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : '';
  return `${first}${second ?? ''}`.toUpperCase();
}

export function getLearnerProfile(userId: string): LearnerProfile {
  const id = userId.trim() || DEFAULT_USER_ID;

  if (id === DEFAULT_USER_ID || !id.includes('@')) {
    const name = 'Manjunath Rao';
    return {
      id,
      name,
      email: 'manjunath.rao@thinkzai.com',
      role: 'Full-stack learner',
      batch: 'Batch 26-A',
      joinedAt: 'January 2026',
      location: 'Bengaluru, India',
      initials: initialsFor(name),
    };
  }

  const [localPart = 'learner'] = id.split('@');
  const name = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(titleCase)
    .join(' ');

  return {
    id,
    name: name || 'Thinkz Learner',
    email: id,
    role: 'Learner',
    batch: 'Batch 26-A',
    joinedAt: 'January 2026',
    location: 'Bengaluru, India',
    initials: initialsFor(name || 'Thinkz Learner'),
  };
}

export default getLearnerProfile;
