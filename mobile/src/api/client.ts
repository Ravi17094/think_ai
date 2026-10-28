import type {
  CourseSearchParams,
  CourseSearchResult,
  Course,
  CreateThreadInput,
  Enrollment,
  ForumCategory,
  ForumThreadPage,
  ForumThreadQuery,
  GlobalSearchResponse,
  SearchResultType,
} from '@/types';
import type {
  BookmarkPage,
  ContentActionResult,
  ContentTarget,
  CheckoutPlan,
  CreateDiscussionResult,
  DiscountValidation,
  FlagQueueItem,
  FlagReport,
  MentionUser,
  ModerationPolicy,
  NotificationPreferences,
  ModerationUser,
  AuditLogEntry,
  PaymentConfirmInput,
  PaymentConfirmation,
  PaymentIntent,
  PaymentIntentInput,
  PaymentStatusResponse,
  SubmitReplyInput,
  SubmitReplyResult,
  ThreadDetail,
  ThreadReply,
  UserPostSummary,
  VoteDirection,
  VoteResult,
} from '@/types/community';

/**
 * Single seam between the screens and the data layer.
 *
 * Every hook in this app depends on this interface only, so swapping the mock
 * implementation for a generated OpenAPI client is a one-line change in
 * `src/api/index.ts`. No component or screen imports a transport directly.
 */
export interface LearningApiClient {
  // Page 1 — Learner Dashboard
  fetchEnrollments(): Promise<Enrollment[]>;

  // Page 2 — My Courses
  searchCourses(params: CourseSearchParams): Promise<CourseSearchResult>;

  // Page 3 — Course Detail
  fetchCourse(courseId: string): Promise<Course>;

  // Page 4 — Global Search
  fetchAllTags(): Promise<string[]>;
  searchGlobal(
    query: string,
    type: SearchResultType
  ): Promise<GlobalSearchResponse>;

  // Page 5 — Forum Home
  fetchForumCategories(): Promise<ForumCategory[]>;
  fetchForumThreads(query: ForumThreadQuery): Promise<ForumThreadPage>;
  createThread(input: CreateThreadInput): Promise<{ id: string }>;

  // Page 6 — Forum Thread Detail (/forum/threads/:id)
  fetchThreadDetail(threadId: string): Promise<ThreadDetail>;
  fetchThreadReplies(threadId: string): Promise<ThreadReply[]>;
  submitReply(threadId: string, input: SubmitReplyInput): Promise<SubmitReplyResult>;
  voteThread(threadId: string, direction: VoteDirection): Promise<VoteResult>;
  setThreadSolved(threadId: string, solved: boolean): Promise<ThreadDetail>;
  searchMentionUsers(query: string): Promise<MentionUser[]>;

  // Notification preferences (/users/:id/notification-preferences)
  fetchNotificationPreferences(userId: string): Promise<NotificationPreferences>;
  saveNotificationPreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences>;

  // Page 7 — Create Post (/forum/new)
  fetchDiscussionCategories(): Promise<ForumCategory[]>;
  createDiscussion(input: CreateThreadInput): Promise<CreateDiscussionResult>;

  // Page 8 — Bookmarks (/forum/bookmarks)
  fetchBookmarks(): Promise<BookmarkPage>;
  addBookmark(userId: string, discussionId: string): Promise<void>;
  removeBookmark(userId: string, discussionId: string): Promise<void>;

  // Page 9 — Moderation Dashboard (/forum/moderate)
  fetchFlaggedQueue(): Promise<FlagQueueItem[]>;
  fetchFlagReports(): Promise<FlagReport[]>;
  fetchModerationPolicy(): Promise<ModerationPolicy>;
  fetchModerationUsers(): Promise<ModerationUser[]>;
  fetchAuditLog(): Promise<AuditLogEntry[]>;
  fetchUserPosts(authorUsername: string): Promise<UserPostSummary[]>;
  dismissFlag(target: ContentTarget): Promise<ContentActionResult>;
  setManagedContentVisibility(
    target: ContentTarget,
    hidden: boolean
  ): Promise<ContentActionResult>;
  deleteManagedContent(target: ContentTarget): Promise<ContentActionResult>;
  warnModerationUser(userId: string): Promise<ModerationUser>;
  banModerationUser(userId: string): Promise<ModerationUser>;
  unbanModerationUser(userId: string): Promise<ModerationUser>;

  // Page 10 — Checkout (/checkout)
  fetchPlans(): Promise<CheckoutPlan[]>;
  validateDiscountCode(input: {
    code: string;
    costCenter?: string;
    department?: string;
    amount?: number;
  }): Promise<DiscountValidation>;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
  confirmPayment(input: PaymentConfirmInput): Promise<PaymentConfirmation>;
  fetchPaymentStatus(paymentId: string): Promise<PaymentStatusResponse>;
}

/** Method names owned by Pages 6–10 (the Day-2 community/commerce slice). */
export type CommunityApiMethod =
  | 'fetchThreadDetail'
  | 'fetchThreadReplies'
  | 'submitReply'
  | 'voteThread'
  | 'setThreadSolved'
  | 'searchMentionUsers'
  | 'fetchNotificationPreferences'
  | 'saveNotificationPreferences'
  | 'fetchDiscussionCategories'
  | 'createDiscussion'
  | 'fetchBookmarks'
  | 'addBookmark'
  | 'removeBookmark'
  | 'fetchFlaggedQueue'
  | 'fetchFlagReports'
  | 'fetchModerationPolicy'
  | 'fetchModerationUsers'
  | 'fetchAuditLog'
  | 'fetchUserPosts'
  | 'dismissFlag'
  | 'setManagedContentVisibility'
  | 'deleteManagedContent'
  | 'warnModerationUser'
  | 'banModerationUser'
  | 'unbanModerationUser'
  | 'fetchPlans'
  | 'validateDiscountCode'
  | 'createPaymentIntent'
  | 'confirmPayment'
  | 'fetchPaymentStatus';

/**
 * Pages 6–10 as a standalone surface. Implemented by the live HTTP client in
 * `src/api/communityClient.ts` (no mock data — every method hits the backend),
 * which is also what tests stub.
 */
export type CommunityApiClient = Pick<LearningApiClient, CommunityApiMethod>;
