import { createCommunityClient, createOrderId } from '@/api/communityClient';
import { API_BASE_URL, ApiError } from '@/api/http';
import { buildAttempts, buildReply, buildThreadDetail } from '@/tests/communityFixtures';

let fetchMock: jest.Mock;

function respond(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function envelope(data: unknown, extra: Record<string, unknown> = {}) {
  return { success: true, data, ...extra };
}

function lastCall(): [string, RequestInit] {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return [url as string, init as RequestInit];
}

function parsedBody(init: RequestInit): unknown {
  return init.body === undefined ? undefined : JSON.parse(init.body as string);
}

beforeEach(() => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('createOrderId', () => {
  it('prefixes a timestamped random token', () => {
    expect(createOrderId('pi')).toMatch(/^pi_[a-z0-9]+[a-z0-9]{6,}$/);
    expect(createOrderId()).toMatch(/^ord_/);
  });
});

describe('Page 6 — thread detail', () => {
  it('GETs the discussion and unwraps the envelope', async () => {
    const thread = buildThreadDetail();
    fetchMock.mockResolvedValueOnce(respond(envelope(thread)));

    const client = createCommunityClient();
    const result = await client.fetchThreadDetail('t-1');

    expect(result).toEqual(thread);
    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE_URL}/forum/threads/t-1`);
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('u1');
  });

  it('posts a reply with parentId null and reads notificationsCreated', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(envelope(buildReply({ id: 'cm-new' }), { notificationsCreated: 2 }))
    );

    const client = createCommunityClient();
    const result = await client.submitReply('t-1', { body: 'Hello @prema' });

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE_URL}/forum/threads/t-1/replies`);
    expect(init.method).toBe('POST');
    expect(parsedBody(init)).toEqual({
      body: 'Hello @prema',
      parentId: null,
    });
    expect(result.reply.id).toBe('cm-new');
    expect(result.notificationsCreated).toBe(2);
  });

  it('votes with the direction body', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(
        envelope({ id: 't-1', upvotes: 6, downvotes: 1, score: 5, userVote: 'up' })
      )
    );

    const client = createCommunityClient();
    const result = await client.voteThread('t-1', 'up');

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE_URL}/discussions/t-1/vote`);
    expect(parsedBody(init)).toEqual({ direction: 'up' });
    expect(result.userVote).toBe('up');
  });

  it('marks a thread solved via PATCH', async () => {
    fetchMock.mockResolvedValueOnce(respond(envelope(buildThreadDetail({ solved: true }))));

    const client = createCommunityClient();
    const result = await client.setThreadSolved('t-1', true);

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE_URL}/forum/threads/t-1/solved`);
    expect(init.method).toBe('PATCH');
    expect(parsedBody(init)).toEqual({ solved: true });
    expect(result.solved).toBe(true);
  });

  it('searches mention users with the q query parameter', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(envelope([{ id: 'u1', name: 'Prema N', username: 'prema' }]))
    );

    const client = createCommunityClient();
    await client.searchMentionUsers('prem');

    expect(lastCall()[0]).toBe(
      `${API_BASE_URL}/users/search?q=prem`
    );
  });

  it('surfaces a network failure as a typed ApiError', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));

    const client = createCommunityClient();
    await expect(client.fetchThreadDetail('t-1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: 'Network error — is the backend running?',
    });
  });
});

describe('Page 7 — categories and discussions', () => {
  it('derives a slug from the category name', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(envelope([{ id: '1', name: 'General Chat', color: '#ff0000' }]))
    );

    const client = createCommunityClient();
    const [category] = await client.fetchDiscussionCategories();

    expect(category).toEqual({
      id: '1',
      name: 'General Chat',
      slug: 'general-chat',
      color: '#ff0000',
    });
  });

  it('creates a discussion and returns its id', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(envelope(buildThreadDetail({ id: 't-new' }), { notificationsCreated: 1 }))
    );

    const client = createCommunityClient();
    const result = await client.createDiscussion({
      title: 'New thread',
      body: 'Body',
      tags: ['jest'],
      categoryId: 'cat-1',
    });

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE_URL}/discussions`);
    expect(parsedBody(init)).toEqual({
      title: 'New thread',
      body: 'Body',
      tags: ['jest'],
      categoryId: 'cat-1',
    });
    expect(result).toEqual({ id: 't-new', notificationsCreated: 1 });
  });
});

describe('Page 8 — bookmarks', () => {
  it('keeps the syncedAt timestamp beside the list', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(
        envelope([{ id: 'bm-1', userId: 'u1', discussionId: 't-1' }], {
          syncedAt: '2026-10-04T10:00:00.000Z',
        })
      )
    );

    const client = createCommunityClient();
    const page = await client.fetchBookmarks();

    expect(page.syncedAt).toBe('2026-10-04T10:00:00.000Z');
    expect(page.bookmarks).toHaveLength(1);
  });

  it('DELETEs by user and discussion segment', async () => {
    fetchMock.mockResolvedValueOnce(respond(envelope(null)));

    const client = createCommunityClient();
    await client.removeBookmark('u1', 't 1/2');

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE_URL}/bookmarks/u1/t%201%2F2`);
    expect(init.method).toBe('DELETE');
  });
});

describe('Page 9 — moderation', () => {
  it('soft delete is one server-side hide + resolve action', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(
        envelope({
          id: 't-9',
          type: 'discussion',
          hidden: true,
          resolved: true,
          deleted: true,
        })
      )
    );

    const client = createCommunityClient();
    const result = await client.deleteManagedContent({ id: 't-9', type: 'discussion' });

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE_URL}/forum/posts/t-9/action`);
    expect(init.method).toBe('PATCH');
    expect(parsedBody(init)).toEqual({ type: 'discussion', action: 'delete' });
    expect(result).toMatchObject({ hidden: true, deleted: true, resolved: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('loads the user posts with author query and slices excerpts', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(
        envelope({
          items: [
            {
              id: 't-1',
              title: 'Long post',
              body: 'x'.repeat(400),
              createdAt: '2026-10-01T10:00:00.000Z',
              solved: true,
              hidden: true,
              replyCount: 4,
            },
          ],
        })
      )
    );

    const client = createCommunityClient();
    const posts = await client.fetchUserPosts('prema');

    expect(lastCall()[0]).toBe(
      `${API_BASE_URL}/discussions?author=prema&limit=20&sort=recent`
    );
    expect(posts[0]!.excerpt).toHaveLength(160);
    expect(posts[0]).toMatchObject({ solved: true, hidden: true, replyCount: 4 });
  });

  it('warns a moderation user with POST', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(envelope({ id: 'u2', name: 'J', username: 'janadeep', warned: true }))
    );

    const client = createCommunityClient();
    const user = await client.warnModerationUser('u2');

    expect(lastCall()[0]).toBe(`${API_BASE_URL}/moderation/users/u2/warn`);
    expect(lastCall()[1].method).toBe('POST');
    expect(user.warned).toBe(true);
  });
});

describe('Page 10 — checkout', () => {
  const courseRow = (overrides: Record<string, unknown> = {}) => ({
    id: 7,
    title: 'Intro to React',
    description: 'Learn React',
    price: 1000,
    status: 'ACTIVE',
    ...overrides,
  });

  it('maps active courses to plans and marks the cheapest recommended', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(
        envelope({
          courses: [
            courseRow({ id: 7 }),
            courseRow({ id: 8, title: 'Advanced React', price: 2500 }),
            courseRow({ id: 9, title: 'Archived', status: 'ARCHIVED', price: 100 }),
          ],
        })
      )
    );

    const client = createCommunityClient();
    const plans = await client.fetchPlans();

    expect(lastCall()[0]).toBe(`${API_BASE_URL}/courses?page=1&limit=20`);
    expect(plans).toHaveLength(2);
    expect(plans.map((plan) => plan.id)).toEqual(['plan-7', 'plan-8']);
    expect(plans[0]!.recommended).toBe(true);
    expect(plans[1]!.recommended).toBe(false);
    expect(plans[0]!.currency).toBe('INR');
  });

  it('returns a valid discount on 200', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(envelope({ valid: true, status: 'valid', discountAmount: 200 }))
    );

    const client = createCommunityClient();
    const result = await client.validateDiscountCode({ code: 'SAVE20', amount: 1000 });

    expect(lastCall()[0]).toBe(`${API_BASE_URL}/v1/payments/validate-discount`);
    expect(result).toMatchObject({ valid: true, status: 'valid', discountAmount: 200 });
  });

  it('maps a 400 rejection to an invalid discount', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(
        { success: false, status: 'expired', message: 'Code expired' },
        400
      )
    );

    const client = createCommunityClient();
    const result = await client.validateDiscountCode({ code: 'OLD20' });

    expect(result).toEqual({
      valid: false,
      status: 'expired',
      message: 'Code expired',
      discount: null,
      discountAmount: 0,
    });
  });

  it('falls back to a deferred intent when the endpoint is missing', async () => {
    fetchMock.mockResolvedValueOnce(respond({ success: false }, 404));

    const client = createCommunityClient();
    const intent = await client.createPaymentIntent({
      amount: 1180,
      currency: 'INR',
      courseId: '7',
    });

    expect(intent.status).toBe('deferred');
    expect(intent.id).toMatch(/^pi_/);
    expect(intent.amount).toBe(1180);
  });

  it('keeps the server intent when the endpoint answers', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(
        envelope({
          id: 'pi_server',
          amount: 1180,
          currency: 'INR',
          courseId: '7',
          status: 'requires_payment_method',
          createdAt: '2026-10-07T10:00:00.000Z',
        })
      )
    );

    const client = createCommunityClient();
    const intent = await client.createPaymentIntent({
      amount: 1180,
      currency: 'INR',
      courseId: '7',
    });

    expect(intent).toMatchObject({ id: 'pi_server', status: 'requires_payment_method' });
  });

  it('rethrows non-deferred intent failures', async () => {
    fetchMock.mockResolvedValueOnce(respond({ success: false, message: 'nope' }, 500));

    const client = createCommunityClient();
    await expect(
      client.createPaymentIntent({ amount: 1, currency: 'INR', courseId: '7' })
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('confirms a successful payment with the instrument digits', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(
        envelope({
          success: true,
          orderId: 'ord_1',
          confirmationId: 'cfm_1',
          attempts: [{ attempt: 1, status: 'succeeded' }],
          attemptsUsed: 1,
          enrollmentUnlocked: true,
        })
      )
    );

    const client = createCommunityClient();
    const result = await client.confirmPayment({
      intent: {
        id: 'pi_1',
        amount: 1180,
        currency: 'INR',
        courseId: '7',
        status: 'requires_payment_method',
        createdAt: '2026-10-07T10:00:00.000Z',
      },
      orderId: 'ord_1',
      userId: 'u1',
      courseId: '7',
      amount: 1180,
      card: { number: '4242 4242 4242 4242', expiry: '12/30', cvv: '123', name: 'PREMA' },
    });

    expect(lastCall()[0]).toBe(`${API_BASE_URL}/v1/payments/confirm`);
    expect(parsedBody(lastCall()[1])).toMatchObject({
      orderId: 'ord_1',
      instrument: '4242424242424242',
      currency: 'INR',
    });
    expect(result).toMatchObject({ success: true, confirmationId: 'cfm_1' });
  });

  it('turns a 402 payload into a structured failure', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(
        {
          success: false,
          message: 'Card declined',
          data: {
            orderId: 'ord_1',
            attempts: buildAttempts(),
            attemptsUsed: 2,
            failureCode: 'card_declined',
          },
        },
        402
      )
    );

    const client = createCommunityClient();
    const result = await client.confirmPayment({
      intent: {
        id: 'pi_1',
        amount: 1180,
        currency: 'INR',
        courseId: '7',
        status: 'requires_payment_method',
        createdAt: '2026-10-07T10:00:00.000Z',
      },
      orderId: 'ord_1',
      userId: 'u1',
      courseId: '7',
      amount: 1180,
      card: { number: '4000000000000002', expiry: '12/30', cvv: '123', name: 'PREMA' },
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toHaveLength(2);
    expect(result.attemptsUsed).toBe(2);
    expect(result.failureCode).toBe('card_declined');
    expect(result.message).toBe('Card declined');
  });
});
