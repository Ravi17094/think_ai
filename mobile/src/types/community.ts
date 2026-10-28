/**
 * Domain models for Pages 6–10 (Forum Thread Detail, Create Post, Bookmarks,
 * Moderation Dashboard, Checkout).
 *
 * Field names mirror the Express backend (`think_ai/backend`) so the HTTP
 * client can be swapped without touching screens, components or hooks.
 * Envelope shape everywhere: `{ success: boolean, data: T, ...extras }`.
 */

import type { ForumCategory } from './index';

// ---------------------------------------------------------------------------
// Page 6 — Forum Thread Detail
// ---------------------------------------------------------------------------

/**
 * Author reference embedded in discussion/comment payloads. The forum backend
 * sends `{ id, name, username }`; `avatarUrl` is optional because only the
 * LMS-side author objects carry it.
 */
export interface ThreadAuthor {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
}

/** `Discussion.serialize()` in `backend/src/models/Discussion.js`. */
export interface ThreadDetail {
  id: string;
  title: string;
  body: string;
  tags: string[];
  categoryId: string;
  authorId: string;
  author: ThreadAuthor;
  createdAt: string;
  updatedAt: string;
  solved: boolean;
  hidden: boolean;
  flagged: boolean;
  views: number;
  upvotes: number;
  downvotes: number;
  score: number;
  replyCount: number;
  userVote: VoteDirection;
}

/** `Comment.serialize()` — flat rows, nesting via `parentId`. */
export interface ThreadReply {
  id: string;
  discussionId: string;
  parentId: string | null;
  body: string;
  authorId: string;
  author: ThreadAuthor;
  createdAt: string;
  hidden: boolean;
  // NOTE: comments carry no server-side score/votes — reply vote buttons are
  // a device-local preference (see `useReplyVotes`), so no score fields here.
}

export type VoteDirection = 'up' | 'down' | 'none';

export interface VoteResult {
  id: string;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: VoteDirection;
}

export interface SubmitReplyInput {
  body: string;
  parentId?: string | null;
}

export interface SubmitReplyResult {
  reply: ThreadReply;
  notificationsCreated: number;
}

/** `GET /api/moderation/users/search` row (mention autocomplete source). */
export interface MentionUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  role?: string;
  banned?: boolean;
  warned?: boolean;
  muted?: boolean;
  avatarColor?: string;
}

// ---------------------------------------------------------------------------
// Page 7 — Create Post
// ---------------------------------------------------------------------------

export interface CreateDiscussionResult {
  id: string;
  notificationsCreated: number;
}

export type { ForumCategory };

// ---------------------------------------------------------------------------
// Page 8 — Bookmarks
// ---------------------------------------------------------------------------

export interface BookmarkRecord {
  id: string;
  userId: string;
  discussionId: string;
  createdAt: string;
  discussion: {
    id: string;
    title: string;
    excerpt?: string;
    body?: string;
    categoryId?: string;
    tags?: string[];
    author?: ThreadAuthor;
    upvotes?: number;
    downvotes?: number;
    score?: number;
    replyCount?: number;
    viewCount?: number;
    views?: number;
    solved?: boolean;
    isSolved?: boolean;
    hidden?: boolean;
    createdAt?: string;
    lastActivityAt?: string;
    userVote?: VoteDirection;
  };
}

/** `GET /api/bookmarks` response extras — drives the sync indicator. */
export interface BookmarkPage {
  bookmarks: BookmarkRecord[];
  syncedAt: string | null;
}

// ---------------------------------------------------------------------------
// Page 9 — Moderation Dashboard
// ---------------------------------------------------------------------------

export type ModerationContentType = 'discussion' | 'comment';

export type FlagSeverity = 'low' | 'medium' | 'high';

/** `buildQueueItem()` in `backend/src/controllers/moderationController.js`. */
export interface FlagQueueItem {
  id: string;
  type: ModerationContentType;
  title: string;
  excerpt: string;
  reason: string | null;
  flaggedAt: string;
  reporterName: string;
  hidden: boolean;
  authorName: string;
  authorId: string;
}

/** `GET /api/moderation/reports` row — also the flag history source. */
export interface FlagReport {
  id: string;
  contentType: ModerationContentType;
  contentId: string;
  reason: string | null;
  createdAt: string;
  reporterName: string;
  authorId: string;
  excerpt: string;
}

/** `GET /api/moderation/policy` — thresholds used to derive severity. */
export interface ModerationPolicy {
  autoFlagReports: number;
  hideReports: number;
  hideWindowMs: number;
  autoHideIsPermanent: boolean;
  windowLabel: string;
}

/** Queue row + client-derived severity (report count vs policy thresholds). */
export interface FlagQueueRow extends FlagQueueItem {
  severity: FlagSeverity;
  reportCount: number;
  reports: FlagReport[];
}

export interface ModerationUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: string;
  banned: boolean;
  warned: boolean;
  muted: boolean;
  avatarColor?: string;
}

/** `GET /api/moderation/audit-log` row. */
export interface AuditLogEntry {
  id: string;
  type: string;
  targetUserId?: string;
  targetContentId?: string;
  contentType?: ModerationContentType;
  detail?: string;
  timestamp: string;
}

export interface ContentTarget {
  id: string;
  type: ModerationContentType;
}

export interface ContentActionResult {
  id: string;
  type: ModerationContentType;
  hidden?: boolean;
  resolved?: boolean;
  /** Present on the soft-delete (hide + resolve) composite. */
  deleted?: boolean;
}

/** One row of the "user posts" list on the user panel. */
export interface UserPostSummary {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
  solved: boolean;
  hidden: boolean;
  replyCount: number;
}

// ---------------------------------------------------------------------------
// Page 10 — Checkout
// ---------------------------------------------------------------------------

export interface CheckoutPlan {
  id: string;
  courseId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  recommended: boolean;
}

export type DiscountType = 'percent' | 'fixed';

export interface DiscountDetails {
  code: string;
  type: DiscountType;
  value: number;
  eligibleDepartments?: string[];
  usage?: number;
  maxUses?: number;
  expiry?: string | null;
}

export interface DiscountValidation {
  valid: boolean;
  status:
    | 'valid'
    | 'invalid-format'
    | 'unknown'
    | 'expired'
    | 'depleted'
    | 'ineligible';
  message: string;
  discount: DiscountDetails | null;
  discountAmount: number;
}

export interface PaymentIntentInput {
  amount: number;
  currency: string;
  courseId: string;
  costCenter?: string;
  discountCode?: string;
}

/**
 * Payment intent. `status: 'deferred'` means the backend intent endpoint
 * (cross-team dependency) is not live yet and the order proceeds through the
 * supported confirm endpoint instead.
 */
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  courseId: string;
  status: 'requires_payment_method' | 'processing' | 'succeeded' | 'failed' | 'deferred';
  createdAt: string;
}

export interface CardDetails {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

export interface PaymentConfirmInput {
  intent: PaymentIntent;
  orderId: string;
  userId: string;
  courseId: string;
  amount: number;
  currency?: string;
  email?: string;
  costCenter?: string;
  discountCode?: string;
  discountValue?: number;
  card: CardDetails;
}

export interface PaymentAttempt {
  attempt: number;
  status: string;
  failureCode?: string;
  transient?: boolean;
  confirmationId?: string;
  startedAt?: string;
  backoffMs?: number;
}

export interface PaymentConfirmation {
  success: boolean;
  orderId: string;
  confirmationId?: string;
  attempts: PaymentAttempt[];
  attemptsUsed: number;
  enrollmentUnlocked?: boolean;
  message?: string;
  failureCode?: string;
}

export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'succeeded'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Receipt payload rendered by the success screen. */
export interface PaymentDetails {
  id: string;
  planName: string;
  amount: number;
  currency: string;
  transactionId: string;
  paidAt: string;
  courseId: string;
  courseTitle?: string;
  receiptEmail?: string;
  failureReason?: string;
}

/** `GET /api/payments/:id/status` response. */
export interface PaymentStatusResponse {
  status: PaymentStatus;
  payment?: PaymentDetails;
  failureCode?: string | null;
}

// ---------------------------------------------------------------------------
// Notification preferences (settings screen)
// ---------------------------------------------------------------------------

export type NotificationEventGroup =
  | 'replies'
  | 'mentions'
  | 'sessions'
  | 'payments';

export type NotificationChannel = 'email' | 'inApp' | 'sms';

export type NotificationGroupPrefs = Record<NotificationChannel, boolean>;

export type NotificationPreferences = Record<
  NotificationEventGroup,
  NotificationGroupPrefs
>;
