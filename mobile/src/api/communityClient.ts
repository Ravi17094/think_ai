import type { CommunityApiClient } from './client';
import { apiData, apiRequest, ApiError } from './http';
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
  ModerationUser,
  NotificationPreferences,
  PaymentStatusResponse,
  AuditLogEntry,
  PaymentConfirmInput,
  PaymentConfirmation,
  PaymentIntent,
  PaymentIntentInput,
  SubmitReplyInput,
  SubmitReplyResult,
  ThreadDetail,
  ThreadReply,
  UserPostSummary,
  VoteDirection,
  VoteResult,
} from '@/types/community';
import type { CreateThreadInput, ForumCategory } from '@/types';

/** Catalogue rows returned by `GET /api/courses` (Prisma `courseSelect`). */
interface CourseCatalogueRow {
  id: number | string;
  title: string;
  description?: string | null;
  category?: string | null;
  price: number;
  duration?: string | null;
  instructorName?: string | null;
  status?: string;
}

interface CourseListPayload {
  courses: CourseCatalogueRow[];
  pagination?: { total?: number; page?: number; limit?: number; totalPages?: number };
}

interface DiscussionListPayload {
  items: {
    id: string;
    title: string;
    body?: string;
    createdAt: string;
    solved?: boolean;
    hidden?: boolean;
    replyCount?: number;
  }[];
}

const EXCERPT_LENGTH = 160;

/** Path param escape so ids with `/` or spaces cannot break the URL. */
function segment(value: string): string {
  return encodeURIComponent(value);
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cardDigits(number: string): string {
  return number.replace(/\D/g, '');
}

/**
 * Order/intent id generator. `Math.random` + timestamp is portable across
 * Hermes/JSC without a `crypto.randomUUID` dependency.
 */
export function createOrderId(prefix = 'ord'): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

/**
 * Live data source for Pages 6–10.
 *
 * Every method talks to the real backend (`think_ai/backend`) through
 * `src/api/http.ts` — there is no mock path. Cross-team endpoints are called
 * exactly as specified and degrade to a typed `ApiError` when unavailable.
 */
export function createCommunityClient(): CommunityApiClient {
  return {
    // ---- Page 6 — Forum Thread Detail -------------------------------------
    fetchThreadDetail(threadId: string): Promise<ThreadDetail> {
      return apiData<ThreadDetail>(`/forum/threads/${segment(threadId)}`);
    },

    fetchThreadReplies(threadId: string): Promise<ThreadReply[]> {
      return apiData<ThreadReply[]>(
        `/forum/threads/${segment(threadId)}/replies`
      );
    },

    async submitReply(
      threadId: string,
      input: SubmitReplyInput
    ): Promise<SubmitReplyResult> {
      const payload = await apiRequest<ThreadReply>(
        `/forum/threads/${segment(threadId)}/replies`,
        {
          method: 'POST',
          body: {
            body: input.body,
            parentId: input.parentId ?? null,
          },
        }
      );
      return {
        reply: payload.data,
        notificationsCreated:
          typeof payload.notificationsCreated === 'number'
            ? payload.notificationsCreated
            : 0,
      };
    },

    voteThread(threadId: string, direction: VoteDirection): Promise<VoteResult> {
      return apiData<VoteResult>(`/discussions/${segment(threadId)}/vote`, {
        method: 'POST',
        body: { direction },
      });
    },

    setThreadSolved(threadId: string, solved: boolean): Promise<ThreadDetail> {
      return apiData<ThreadDetail>(
        `/forum/threads/${segment(threadId)}/solved`,
        {
          method: 'PATCH',
          body: { solved },
        }
      );
    },

    searchMentionUsers(query: string): Promise<MentionUser[]> {
      return apiData<MentionUser[]>('/users/search', {
        query: { q: query },
      });
    },

    fetchNotificationPreferences(
      userId: string
    ): Promise<NotificationPreferences> {
      return apiData<NotificationPreferences>(
        `/users/${segment(userId)}/notification-preferences`
      );
    },

    saveNotificationPreferences(
      userId: string,
      preferences: NotificationPreferences
    ): Promise<NotificationPreferences> {
      return apiData<NotificationPreferences>(
        `/users/${segment(userId)}/notification-preferences`,
        { method: 'PATCH', body: preferences }
      );
    },

    // ---- Page 7 — Create Post ---------------------------------------------
    async fetchDiscussionCategories(): Promise<ForumCategory[]> {
      const rows = await apiData<{ id: string; name: string; color?: string }[]>(
        '/categories'
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: slugify(row.name),
        color: row.color ?? '#6366f1',
      }));
    },

    async createDiscussion(input: CreateThreadInput): Promise<CreateDiscussionResult> {
      const payload = await apiRequest<ThreadDetail>('/discussions', {
        method: 'POST',
        body: {
          title: input.title,
          body: input.body,
          tags: input.tags,
          categoryId: input.categoryId,
        },
      });
      return {
        id: payload.data.id,
        notificationsCreated:
          typeof payload.notificationsCreated === 'number'
            ? payload.notificationsCreated
            : 0,
      };
    },

    // ---- Page 8 — Bookmarks ------------------------------------------------
    async fetchBookmarks(): Promise<BookmarkPage> {
      const payload = await apiRequest<BookmarkPage['bookmarks']>('/bookmarks');
      return {
        bookmarks: payload.data ?? [],
        syncedAt: typeof payload.syncedAt === 'string' ? payload.syncedAt : null,
      };
    },

    async addBookmark(userId: string, discussionId: string): Promise<void> {
      await apiData('/bookmarks', {
        method: 'POST',
        body: { userId, discussionId },
      });
    },

    async removeBookmark(userId: string, discussionId: string): Promise<void> {
      await apiData(`/bookmarks/${segment(userId)}/${segment(discussionId)}`, {
        method: 'DELETE',
      });
    },

    // ---- Page 9 — Moderation Dashboard ------------------------------------
    fetchFlaggedQueue(): Promise<FlagQueueItem[]> {
      return apiData<FlagQueueItem[]>('/forum/flags');
    },

    fetchFlagReports(): Promise<FlagReport[]> {
      return apiData<FlagReport[]>('/moderation/reports');
    },

    fetchModerationPolicy(): Promise<ModerationPolicy> {
      return apiData<ModerationPolicy>('/moderation/policy');
    },

    fetchModerationUsers(): Promise<ModerationUser[]> {
      return apiData<ModerationUser[]>('/moderation/users');
    },

    fetchAuditLog(): Promise<AuditLogEntry[]> {
      return apiData<AuditLogEntry[]>('/moderation/audit-log');
    },

    async fetchUserPosts(authorUsername: string): Promise<UserPostSummary[]> {
      const page = await apiData<DiscussionListPayload>('/discussions', {
        query: { author: authorUsername, limit: 20, sort: 'recent' },
      });
      return (page.items ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        excerpt: (item.body ?? '').slice(0, EXCERPT_LENGTH),
        createdAt: item.createdAt,
        solved: item.solved ?? false,
        hidden: item.hidden ?? false,
        replyCount: item.replyCount ?? 0,
      }));
    },

    async dismissFlag(target: ContentTarget): Promise<ContentActionResult> {
      const data = await apiData<{ id: string; type: string; resolved?: boolean }>(
        `/forum/posts/${segment(target.id)}/action`,
        { method: 'PATCH', body: { type: target.type, action: 'resolve' } }
      );
      return { id: data.id, type: target.type, resolved: data.resolved ?? true };
    },

    async setManagedContentVisibility(
      target: ContentTarget,
      hidden: boolean
    ): Promise<ContentActionResult> {
      const data = await apiData<{ id: string; type: string; hidden: boolean }>(
        `/forum/posts/${segment(target.id)}/action`,
        {
          method: 'PATCH',
          body: { type: target.type, action: hidden ? 'hide' : 'show' },
        }
      );
      return { id: data.id, type: target.type, hidden: data.hidden };
    },

    /**
     * Soft-delete: the backend aliases `delete` to hide + resolve in one
     * atomic action, so the moderation screen needs a single round-trip.
     */
    async deleteManagedContent(target: ContentTarget): Promise<ContentActionResult> {
      const data = await apiData<{
        id: string;
        type: string;
        hidden?: boolean;
        resolved?: boolean;
        deleted?: boolean;
      }>(`/forum/posts/${segment(target.id)}/action`, {
        method: 'PATCH',
        body: { type: target.type, action: 'delete' },
      });
      return {
        id: data.id,
        type: target.type,
        hidden: data.hidden ?? true,
        resolved: data.resolved ?? true,
        deleted: data.deleted ?? true,
      };
    },

    warnModerationUser(userId: string): Promise<ModerationUser> {
      return apiData<ModerationUser>(`/moderation/users/${segment(userId)}/warn`, {
        method: 'POST',
      });
    },

    banModerationUser(userId: string): Promise<ModerationUser> {
      return apiData<ModerationUser>(`/moderation/users/${segment(userId)}/ban`, {
        method: 'POST',
      });
    },

    unbanModerationUser(userId: string): Promise<ModerationUser> {
      return apiData<ModerationUser>(`/moderation/users/${segment(userId)}/unban`, {
        method: 'POST',
      });
    },

    // ---- Page 10 — Checkout ------------------------------------------------
    async fetchPlans(): Promise<CheckoutPlan[]> {
      const payload = await apiData<CourseListPayload>('/courses', {
        query: { page: 1, limit: 20 },
      });
      const active = (payload.courses ?? []).filter(
        (course) => (course.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE'
      );
      const cheapest = active.reduce<number | null>(
        (min, course) =>
          min === null ? course.price : Math.min(min, course.price),
        null
      );
      return active.map((course) => ({
        id: `plan-${course.id}`,
        courseId: String(course.id),
        title: course.title,
        description: course.description ?? '',
        price: course.price,
        currency: 'INR',
        features: [
          course.duration,
          course.category,
          course.instructorName ? `Instructor: ${course.instructorName}` : null,
        ].filter((feature): feature is string => Boolean(feature)),
        recommended: course.price === cheapest,
      }));
    },

    async validateDiscountCode(input: {
      code: string;
      costCenter?: string;
      department?: string;
      amount?: number;
    }): Promise<DiscountValidation> {
      try {
        const data = await apiData<{
          valid: boolean;
          status?: string;
          message?: string;
          discount?: DiscountValidation['discount'];
          discountAmount?: number;
        }>('/v1/payments/validate-discount', {
          method: 'POST',
          body: {
            code: input.code,
            costCenter: input.costCenter,
            department: input.department,
            amount: input.amount,
          },
        });
        return {
          valid: data.valid === true,
          status: normalizeDiscountStatus(data.status),
          message: data.message ?? 'Discount validated',
          discount: data.discount ?? null,
          discountAmount: data.discountAmount ?? 0,
        };
      } catch (cause) {
        // The API answers invalid codes with 400/404 + `{ status, message }`.
        if (cause instanceof ApiError && cause.payload) {
          return {
            valid: false,
            status: normalizeDiscountStatus(
              typeof cause.payload.status === 'string' ? cause.payload.status : undefined
            ),
            message: cause.message,
            discount: null,
            discountAmount: 0,
          };
        }
        throw cause;
      }
    },

    /**
     * Payment-intent creation (cross-team dependency, see TEST_REPORT).
     *
     * Calls `POST /api/v1/payments/intents`. When the endpoint is not deployed
     * yet (404/405/501) the intent is returned with `status: 'deferred'` so the
     * supported `confirm` endpoint can process the order; any other failure
     * still surfaces as an error.
     */
    async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
      const fallback: PaymentIntent = {
        id: createOrderId('pi'),
        amount: input.amount,
        currency: input.currency,
        courseId: input.courseId,
        status: 'deferred',
        createdAt: new Date().toISOString(),
      };
      try {
        const data = await apiData<Partial<PaymentIntent>>('/v1/payments/intents', {
          method: 'POST',
          body: {
            amount: input.amount,
            currency: input.currency,
            courseId: input.courseId,
            costCenter: input.costCenter,
            discountCode: input.discountCode,
          },
        });
        return {
          id: data.id ?? fallback.id,
          amount: data.amount ?? fallback.amount,
          currency: data.currency ?? fallback.currency,
          courseId: data.courseId ?? fallback.courseId,
          status: data.status ?? 'requires_payment_method',
          createdAt: data.createdAt ?? fallback.createdAt,
        };
      } catch (cause) {
        if (
          cause instanceof ApiError &&
          [404, 405, 501].includes(cause.status)
        ) {
          return fallback;
        }
        throw cause;
      }
    },

    async confirmPayment(input: PaymentConfirmInput): Promise<PaymentConfirmation> {
      try {
        const data = await apiData<{
          success: boolean;
          orderId: string;
          confirmationId?: string;
          attempts?: PaymentConfirmation['attempts'];
          attemptsUsed?: number;
          enrollmentUnlocked?: boolean;
        }>('/v1/payments/confirm', {
          method: 'POST',
          body: {
            orderId: input.orderId,
            userId: input.userId,
            courseId: input.courseId,
            amount: input.amount,
            currency: input.currency ?? 'INR',
            email: input.email,
            costCenter: input.costCenter,
            discountCode: input.discountCode,
            discountValue: input.discountValue,
            instrument: cardDigits(input.card.number),
          },
        });
        return {
          success: data.success !== false,
          orderId: data.orderId ?? input.orderId,
          confirmationId: data.confirmationId,
          attempts: data.attempts ?? [],
          attemptsUsed: data.attemptsUsed ?? (data.attempts?.length ?? 0),
          enrollmentUnlocked: data.enrollmentUnlocked,
        };
      } catch (cause) {
        // 402 = gateway rejection; the body carries the structured result.
        if (
          cause instanceof ApiError &&
          cause.status === 402 &&
          cause.payload &&
          typeof cause.payload.data === 'object' &&
          cause.payload.data !== null
        ) {
          const failure = cause.payload.data as Partial<PaymentConfirmation>;
          return {
            success: false,
            orderId: failure.orderId ?? input.orderId,
            attempts: failure.attempts ?? [],
            attemptsUsed: failure.attemptsUsed ?? (failure.attempts?.length ?? 0),
            message: failure.message ?? cause.message,
            failureCode: failure.failureCode,
          };
        }
        throw cause;
      }
    },

    fetchPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
      return apiData<PaymentStatusResponse>(
        `/v1/payments/${segment(paymentId)}/status`
      );
    },
  };
}

function normalizeDiscountStatus(
  status: string | undefined
): DiscountValidation['status'] {
  switch (status) {
    case 'valid':
    case 'invalid-format':
    case 'unknown':
    case 'expired':
    case 'depleted':
    case 'ineligible':
      return status;
    default:
      return 'unknown';
  }
}
