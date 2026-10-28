import type {
  AuditLogEntry,
  BookmarkRecord,
  CheckoutPlan,
  FlagQueueItem,
  FlagReport,
  ModerationPolicy,
  ModerationUser,
  PaymentAttempt,
  PaymentConfirmation,
  ThreadDetail,
  ThreadReply,
} from '@/types/community';

export function buildThreadDetail(
  overrides: Partial<ThreadDetail> = {}
): ThreadDetail {
  return {
    id: 't-1',
    title: 'Why does my useEffect run twice?',
    body: 'In **React 18** my effect fires twice @preman.',
    tags: ['react', 'hooks'],
    categoryId: 'cat-1',
    authorId: 'u1',
    author: { id: 'u1', name: 'Prema N', username: 'prema' },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    solved: false,
    hidden: false,
    flagged: false,
    views: 42,
    upvotes: 5,
    downvotes: 1,
    score: 4,
    replyCount: 2,
    userVote: 'none',
    ...overrides,
  };
}

export function buildReply(overrides: Partial<ThreadReply> = {}): ThreadReply {
  return {
    id: 'cm-1',
    discussionId: 't-1',
    parentId: null,
    body: 'Use a cleanup function @prema',
    authorId: 'u2',
    author: { id: 'u2', name: 'Janadeep K', username: 'janadeep' },
    createdAt: '2026-10-01T11:00:00.000Z',
    hidden: false,
    ...overrides,
  };
}

export function buildBookmark(
  overrides: Partial<BookmarkRecord> = {}
): BookmarkRecord {
  return {
    id: 'bm-1',
    userId: 'u1',
    discussionId: 't-1',
    createdAt: '2026-10-02T09:00:00.000Z',
    discussion: {
      id: 't-1',
      title: 'Saved thread',
      excerpt: 'A saved discussion excerpt',
      author: { id: 'u2', name: 'Janadeep K' },
      replyCount: 3,
      score: 7,
      createdAt: '2026-10-01T10:00:00.000Z',
    },
    ...overrides,
  };
}

export function buildQueueItem(
  overrides: Partial<FlagQueueItem> = {}
): FlagQueueItem {
  return {
    id: 't-9',
    type: 'discussion',
    title: 'Suspicious thread',
    excerpt: 'Buy cheap followers now…',
    reason: 'spam',
    flaggedAt: '2026-10-03T08:00:00.000Z',
    reporterName: 'Ada L',
    hidden: false,
    authorName: 'Spammer',
    authorId: 'u9',
    ...overrides,
  };
}

export function buildReport(
  overrides: Partial<FlagReport> = {}
): FlagReport {
  return {
    id: 'rp-1',
    contentType: 'discussion',
    contentId: 't-9',
    reason: 'spam',
    createdAt: '2026-10-03T08:00:00.000Z',
    reporterName: 'Ada L',
    authorId: 'u9',
    excerpt: 'Buy cheap followers now…',
    ...overrides,
  };
}

export const TEST_POLICY: ModerationPolicy = {
  autoFlagReports: 2,
  hideReports: 4,
  hideWindowMs: 86_400_000,
  autoHideIsPermanent: false,
  windowLabel: '24h',
};

export function buildModerationUser(
  overrides: Partial<ModerationUser> = {}
): ModerationUser {
  return {
    id: 'u2',
    name: 'Janadeep K',
    username: 'janadeep',
    email: 'jana@example.com',
    role: 'member',
    banned: false,
    warned: false,
    muted: false,
    ...overrides,
  };
}

export function buildAuditEntry(
  overrides: Partial<AuditLogEntry> = {}
): AuditLogEntry {
  return {
    id: 'au-1',
    type: 'content_hidden',
    targetContentId: 't-9',
    contentType: 'discussion',
    detail: 'Hidden by moderator',
    timestamp: '2026-10-03T09:00:00.000Z',
    ...overrides,
  };
}

export function buildPlan(overrides: Partial<CheckoutPlan> = {}): CheckoutPlan {
  return {
    id: 'plan-1',
    courseId: '1',
    title: 'Intro to React',
    description: 'Learn React from scratch',
    price: 1000,
    currency: 'INR',
    features: ['4h video', 'Instructor: Ada'],
    recommended: false,
    ...overrides,
  };
}

export function buildAttempts(): PaymentAttempt[] {
  return [
    { attempt: 1, status: 'declined', failureCode: 'card_declined', transient: false },
    { attempt: 2, status: 'declined', failureCode: 'card_declined', transient: false },
  ];
}

export function buildConfirmation(
  overrides: Partial<PaymentConfirmation> = {}
): PaymentConfirmation {
  return {
    success: true,
    orderId: 'ord_test',
    confirmationId: 'cfm_test',
    attempts: [],
    attemptsUsed: 0,
    enrollmentUnlocked: true,
    ...overrides,
  };
}
