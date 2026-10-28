import { act, fireEvent, screen } from '@testing-library/react-native';

import { REPLY_INDENT } from '@/components/forum/ReplyRow';
import { SEARCH_DEBOUNCE_MS } from '@/theme/tokens';
import { ForumThreadDetailScreen } from '@/screens/forum/ForumThreadDetailScreen';
import {
  buildReply,
  buildThreadDetail,
} from '@/tests/communityFixtures';
import { createCommunityTestClient } from '@/tests/communityClientStub';
import { flushAllPendingWork, renderScreen } from '@/tests/helpers';

const CATEGORY = {
  id: 'cat-1',
  name: 'General Chat',
  slug: 'general-chat',
  color: '#6366f1',
};

function buildClient() {
  const client = createCommunityTestClient({
    fetchThreadDetail: jest.fn().mockResolvedValue(buildThreadDetail()),
    fetchThreadReplies: jest
      .fn()
      .mockResolvedValueOnce([
        buildReply(),
        buildReply({ id: 'cm-2', parentId: 'cm-1', body: 'Nested reply' }),
      ])
      .mockResolvedValue([
        buildReply(),
        buildReply({ id: 'cm-2', parentId: 'cm-1', body: 'Nested reply' }),
        buildReply({ id: 'cm-3', body: 'Brand new reply' }),
      ]),
    fetchDiscussionCategories: jest.fn().mockResolvedValue([CATEGORY]),
    voteThread: jest.fn().mockResolvedValue({
      id: 't-1',
      upvotes: 6,
      downvotes: 1,
      score: 5,
      userVote: 'up',
    }),
    setThreadSolved: jest
      .fn()
      .mockResolvedValue(buildThreadDetail({ solved: true })),
    submitReply: jest.fn().mockResolvedValue({
      reply: buildReply({ id: 'cm-new', body: 'Brand new reply' }),
      notificationsCreated: 0,
    }),
    searchMentionUsers: jest.fn().mockResolvedValue([
      { id: 'u1', name: 'Prema N', username: 'prema' },
    ]),
  });
  return client;
}

function renderThread(client: ReturnType<typeof createCommunityTestClient>) {
  return renderScreen(ForumThreadDetailScreen, {
    client,
    name: 'ForumThread',
    params: { threadId: 't-1' },
  });
}

async function loadThread(client: ReturnType<typeof createCommunityTestClient>) {
  renderThread(client);
  await flushAllPendingWork();
}

function replyItem(index: number) {
  return screen.getByTestId(`reply-list-item-${index}`);
}

function flattenStyle(style: unknown): Record<string, number> {
  const flat: Record<string, number> = {};
  for (const entry of Array.isArray(style) ? style : [style]) {
    if (entry && typeof entry === 'object') {
      Object.assign(flat, entry);
    }
  }
  return flat;
}

describe('ForumThreadDetailScreen', () => {
  it('shows the skeleton first and then the thread with its replies', async () => {
    const client = buildClient();
    renderThread(client);

    expect(screen.getByTestId('thread-detail-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('thread-header')).toBeNull();

    await flushAllPendingWork();

    expect(screen.queryByTestId('thread-detail-skeleton')).toBeNull();
    expect(screen.getByTestId('thread-header-title')).toHaveTextContent(
      'Why does my useEffect run twice?'
    );
    expect(screen.getByTestId('replies-title')).toHaveTextContent('2 replies');
    expect(screen.getByTestId('reply-list')).toBeTruthy();
  });

  it('indents a nested reply by one level', async () => {
    await loadThread(buildClient());

    expect(flattenStyle(replyItem(0).props.style).marginLeft).toBe(0);
    expect(flattenStyle(replyItem(1).props.style).marginLeft).toBe(REPLY_INDENT);
  });

  it('surfaces a load failure with a retry that refetches', async () => {
    const client = buildClient();
    (client.fetchThreadDetail as jest.Mock).mockRejectedValueOnce(
      new Error('Forum offline')
    );
    renderThread(client);
    await flushAllPendingWork();

    expect(screen.getByTestId('thread-detail-error-message')).toHaveTextContent(
      'Forum offline'
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('thread-detail-error-retry'));
    });
    await flushAllPendingWork();

    expect(client.fetchThreadDetail).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('thread-header')).toBeTruthy();
  });

  it('optimistically scores a thread vote and reconciles with the server', async () => {
    await loadThread(buildClient());

    expect(screen.getByTestId('thread-header-votes-score')).toHaveTextContent('4');

    await act(async () => {
      fireEvent.press(screen.getByTestId('thread-header-votes-up'));
    });
    // Optimistic bump lands before the request settles.
    expect(screen.getByTestId('thread-header-votes-score')).toHaveTextContent('5');
    expect(screen.getByTestId('thread-header-votes-up').props.accessibilityState).toMatchObject(
      { selected: true }
    );

    await flushAllPendingWork();

    expect(screen.getByTestId('thread-header-votes-score')).toHaveTextContent('5');
    expect(screen.queryByTestId('thread-action-error')).toBeNull();
  });

  it('rolls a failed vote back and reports the action error', async () => {
    const client = buildClient();
    (client.voteThread as jest.Mock).mockRejectedValue(new Error('Vote failed'));
    await loadThread(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('thread-header-votes-up'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('thread-header-votes-score')).toHaveTextContent('4');
    expect(screen.getByTestId('thread-action-error')).toHaveTextContent('Vote failed');
  });

  it('lets the author toggle solved optimistically', async () => {
    const client = buildClient();
    await loadThread(client);

    expect(screen.getByTestId('thread-header-solved')).toHaveTextContent(
      'Mark as solved'
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('thread-header-solved'));
    });
    expect(screen.getByTestId('thread-header-solved')).toHaveTextContent(
      '✓ Solved — tap to reopen'
    );

    await flushAllPendingWork();
    expect(client.setThreadSolved).toHaveBeenCalledWith('t-1', true);
    expect(screen.queryByTestId('thread-action-error')).toBeNull();
  });

  it('rolls a failed solved toggle back', async () => {
    const client = buildClient();
    (client.setThreadSolved as jest.Mock).mockRejectedValue(new Error('Not allowed'));
    await loadThread(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('thread-header-solved'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('thread-header-solved')).toHaveTextContent(
      'Mark as solved'
    );
    expect(screen.getByTestId('thread-action-error')).toHaveTextContent('Not allowed');
  });

  it('posts a reply and appends it locally', async () => {
    const client = buildClient();
    await loadThread(client);

    expect(screen.getByTestId('submit-reply').props.accessibilityState).toMatchObject({
      disabled: true,
    });

    fireEvent.changeText(
      screen.getByTestId('reply-editor-input'),
      'A shiny new reply'
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-reply'));
    });
    await flushAllPendingWork();

    expect(client.submitReply).toHaveBeenCalledWith('t-1', {
      body: 'A shiny new reply',
      parentId: null,
    });
    expect(screen.getByTestId('replies-title')).toHaveTextContent('3 replies');
    expect(screen.queryByTestId('reply-list-empty')).toBeNull();
    expect(screen.getByTestId('reply-editor-input').props.value).toBe('');
  });

  it('keeps the draft and shows the error when the reply fails', async () => {
    const client = buildClient();
    (client.submitReply as jest.Mock).mockRejectedValue(new Error('Forum offline'));
    await loadThread(client);

    fireEvent.changeText(screen.getByTestId('reply-editor-input'), 'Doomed reply');
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-reply'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('reply-editor-error')).toHaveTextContent('Forum offline');
    expect(screen.getByTestId('reply-editor-input').props.value).toBe('Doomed reply');
    expect(screen.getByTestId('replies-title')).toHaveTextContent('2 replies');
  });

  it('targets a nested reply through Reply to', async () => {
    const client = buildClient();
    await loadThread(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('reply-list-item-0-reply-to'));
    });

    expect(screen.getByTestId('replying-chip')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('cancel-reply-target'));
    });
    expect(screen.queryByTestId('replying-chip')).toBeNull();
  });

  it('searches members after the debounce and inserts a mention', async () => {
    const client = buildClient();
    await loadThread(client);

    fireEvent.changeText(screen.getByTestId('reply-editor-input'), 'hello @pre');
    fireEvent(screen.getByTestId('reply-editor-input'), 'selectionChange', {
      nativeEvent: { selection: { start: 10, end: 10 } },
    });
    await flushAllPendingWork(3, SEARCH_DEBOUNCE_MS);

    expect(client.searchMentionUsers).toHaveBeenCalledWith('pre');
    expect(screen.getByTestId('mention-option-prema')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('mention-option-prema'));
    });
    expect(screen.getByTestId('reply-editor-input').props.value).toBe('hello @prema ');
  });

  it('toggles the composer into a rendered preview', async () => {
    await loadThread(buildClient());

    fireEvent.changeText(
      screen.getByTestId('reply-editor-input'),
      'Body with **bold**'
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('reply-editor-toggle-preview'));
    });

    expect(screen.getByTestId('reply-editor-preview')).toBeTruthy();
    expect(screen.queryByTestId('reply-editor-input')).toBeNull();
    expect(screen.getByTestId('reply-editor-preview-content')).toHaveTextContent(
      'Body with bold'
    );
  });
});
