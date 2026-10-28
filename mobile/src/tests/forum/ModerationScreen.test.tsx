import { act, fireEvent, screen } from '@testing-library/react-native';

import { ModerationScreen } from '@/screens/forum/ModerationScreen';
import {
  buildAuditEntry,
  buildModerationUser,
  buildQueueItem,
  buildReport,
  TEST_POLICY,
} from '@/tests/communityFixtures';
import { createCommunityTestClient } from '@/tests/communityClientStub';
import { flushAllPendingWork, renderScreen } from '@/tests/helpers';

const TARGET = { id: 't-9', type: 'discussion' };

function buildClient(
  overrides: Parameters<typeof createCommunityTestClient>[0] = {}
) {
  // Mutable store so warn/ban responses survive the hook's refresh cycle.
  const members = [
    buildModerationUser(),
    buildModerationUser({ id: 'u3', name: 'Ada L', username: 'ada' }),
  ];
  return createCommunityTestClient({
    fetchFlaggedQueue: jest.fn().mockResolvedValue([buildQueueItem()]),
    fetchFlagReports: jest
      .fn()
      .mockResolvedValue([
        buildReport({ id: 'rp-1' }),
        buildReport({ id: 'rp-2' }),
      ]),
    fetchModerationPolicy: jest.fn().mockResolvedValue(TEST_POLICY),
    fetchModerationUsers: jest
      .fn()
      .mockImplementation(async () => members.map((member) => ({ ...member }))),
    fetchAuditLog: jest.fn().mockResolvedValue([buildAuditEntry()]),
    fetchUserPosts: jest.fn().mockResolvedValue([
      {
        id: 't-5',
        title: 'Janadeep’s question',
        excerpt: 'Excerpt of the post',
        createdAt: '2026-10-04T10:00:00.000Z',
        solved: false,
        hidden: false,
        replyCount: 2,
      },
    ]),
    setManagedContentVisibility: jest.fn().mockResolvedValue({
      id: 't-9',
      type: 'discussion',
      hidden: true,
    }),
    dismissFlag: jest.fn().mockResolvedValue({
      id: 't-9',
      type: 'discussion',
      resolved: true,
    }),
    deleteManagedContent: jest.fn().mockResolvedValue({
      id: 't-9',
      type: 'discussion',
      hidden: true,
      deleted: true,
      resolved: true,
    }),
    warnModerationUser: jest.fn().mockImplementation(async (userId: string) => {
      const member = members.find((entry) => entry.id === userId);
      if (member) {
        member.warned = true;
      }
      return { ...(member ?? buildModerationUser()) };
    }),
    banModerationUser: jest.fn().mockImplementation(async (userId: string) => {
      const member = members.find((entry) => entry.id === userId);
      if (member) {
        member.banned = true;
      }
      return { ...(member ?? buildModerationUser()) };
    }),
    unbanModerationUser: jest.fn().mockImplementation(async (userId: string) => {
      const member = members.find((entry) => entry.id === userId);
      if (member) {
        member.banned = false;
      }
      return { ...(member ?? buildModerationUser()) };
    }),
    ...overrides,
  });
}

function renderModeration(client: ReturnType<typeof createCommunityTestClient>) {
  return renderScreen(ModerationScreen, { client, name: 'Moderation' });
}

async function loadModeration(
  client: ReturnType<typeof createCommunityTestClient>
) {
  renderModeration(client);
  await flushAllPendingWork();
}

describe('ModerationScreen — flag queue', () => {
  it('shows the skeleton, then the queue with derived severity', async () => {
    const client = buildClient();
    renderModeration(client);

    expect(screen.getByTestId('flag-queue-table-skeleton')).toBeTruthy();

    await flushAllPendingWork();

    expect(screen.queryByTestId('flag-queue-table-skeleton')).toBeNull();
    expect(screen.getByTestId('flag-queue-table-row-0-title')).toHaveTextContent(
      'Suspicious thread'
    );
    expect(screen.getByTestId('severity-badge-medium')).toHaveTextContent('Medium');
    expect(screen.getByTestId('flag-queue-table-row-0-reports')).toHaveTextContent('2');
    expect(screen.getByTestId('moderation-header')).toHaveTextContent(
      /1 flagged item awaiting review/
    );
  });

  it('shows an error state when the queue fails, with a retry', async () => {
    const client = buildClient({
      fetchFlaggedQueue: jest.fn().mockRejectedValue(new Error('Moderation offline')),
    });
    renderModeration(client);
    await flushAllPendingWork();

    expect(screen.getByTestId('error-state-message')).toHaveTextContent(
      'Moderation offline'
    );

    (client.fetchFlaggedQueue as jest.Mock).mockResolvedValue([buildQueueItem()]);
    await act(async () => {
      fireEvent.press(screen.getByTestId('error-state-retry'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('flag-queue-table-row-0')).toBeTruthy();
  });

  it('previews a flagged item in the modal', async () => {
    await loadModeration(buildClient());

    await act(async () => {
      fireEvent.press(screen.getByTestId('flag-queue-table-row-0-preview'));
    });

    expect(screen.getByTestId('preview-modal-title')).toHaveTextContent(
      'Suspicious thread'
    );
    expect(screen.getByTestId('preview-modal-meta')).toHaveTextContent(
      /medium severity/
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('preview-modal-done'));
    });
    expect(screen.queryByTestId('preview-modal-title')).toBeNull();
  });

  it('hides content optimistically through the visibility action', async () => {
    const client = buildClient();
    await loadModeration(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('flag-queue-table-row-0-visibility'));
    });
    await flushAllPendingWork();

    expect(client.setManagedContentVisibility).toHaveBeenCalledWith(TARGET, true);
  });

  it('reports a failed visibility change in the action banner', async () => {
    const client = buildClient({
      setManagedContentVisibility: jest
        .fn()
        .mockRejectedValue(new Error('Not allowed')),
    });
    await loadModeration(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('flag-queue-table-row-0-visibility'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('moderation-action-error')).toHaveTextContent(
      'Not allowed'
    );
  });

  it('dismisses a flag through the API', async () => {
    const client = buildClient();
    await loadModeration(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('flag-queue-table-row-0-dismiss'));
    });
    await flushAllPendingWork();

    expect(client.dismissFlag).toHaveBeenCalledWith(TARGET);
  });

  it('soft-deletes through the confirm dialog', async () => {
    const client = buildClient();
    await loadModeration(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('flag-queue-table-row-0-delete'));
    });
    expect(screen.getByTestId('moderation-confirm-message')).toHaveTextContent(
      /will be hidden from the community and its flags resolved\./
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('moderation-confirm-confirm'));
    });
    await flushAllPendingWork();

    expect(client.deleteManagedContent).toHaveBeenCalledWith(TARGET);
    expect(screen.queryByTestId('moderation-confirm-message')).toBeNull();
  });

  it('cancels the destructive confirm dialog', async () => {
    await loadModeration(buildClient());

    await act(async () => {
      fireEvent.press(screen.getByTestId('flag-queue-table-row-0-delete'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('moderation-confirm-cancel'));
    });

    expect(screen.queryByTestId('moderation-confirm-message')).toBeNull();
  });
});

describe('ModerationScreen — members', () => {
  it('searches members and filters the list', async () => {
    await loadModeration(buildClient());

    await act(async () => {
      fireEvent.press(screen.getByTestId('moderation-tab-users'));
    });
    expect(screen.getByTestId('user-panel-count')).toHaveTextContent(
      '2 of 2 members'
    );

    fireEvent.changeText(screen.getByTestId('user-panel-search-field'), 'ada');
    await flushAllPendingWork();

    expect(screen.getByTestId('user-panel-count')).toHaveTextContent(
      '1 of 2 members'
    );
    expect(screen.getByTestId('user-panel-user-0')).toBeTruthy();
  });

  it('opens a member detail and loads their posts', async () => {
    const client = buildClient();
    await loadModeration(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('moderation-tab-users'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('user-panel-user-0'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('user-panel-detail-name')).toHaveTextContent(
      'Janadeep K'
    );
    expect(client.fetchUserPosts).toHaveBeenCalledWith('janadeep');
    expect(screen.getByTestId('user-panel-post-0-title')).toHaveTextContent(
      'Janadeep’s question'
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('user-panel-back'));
    });
    expect(screen.queryByTestId('user-panel-detail')).toBeNull();
  });

  it('warns the selected member', async () => {
    const client = buildClient();
    await loadModeration(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('moderation-tab-users'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('user-panel-user-0'));
    });
    await flushAllPendingWork();

    await act(async () => {
      fireEvent.press(screen.getByTestId('user-panel-warn'));
    });
    await flushAllPendingWork();

    expect(client.warnModerationUser).toHaveBeenCalledWith('u2');
  });

  it('bans through the confirm dialog and flips the detail buttons', async () => {
    const client = buildClient();
    await loadModeration(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('moderation-tab-users'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('user-panel-user-0'));
    });
    await flushAllPendingWork();

    await act(async () => {
      fireEvent.press(screen.getByTestId('user-panel-ban'));
    });
    expect(screen.getByTestId('moderation-confirm-message')).toHaveTextContent(
      /will no longer be able to post\./
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('moderation-confirm-confirm'));
    });
    await flushAllPendingWork();

    expect(client.banModerationUser).toHaveBeenCalledWith('u2');
    // Server response marks the member banned → Unban appears.
    expect(screen.getByTestId('user-panel-unban')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('user-panel-unban'));
    });
    await flushAllPendingWork();
    expect(client.unbanModerationUser).toHaveBeenCalledWith('u2');
  });
});

describe('ModerationScreen — audit', () => {
  it('lists audit entries on the audit tab', async () => {
    await loadModeration(buildClient());

    await act(async () => {
      fireEvent.press(screen.getByTestId('moderation-tab-audit'));
    });

    expect(screen.getByTestId('audit-log-list-row-0')).toBeTruthy();
    expect(screen.getByTestId('audit-log-list-row-0-type')).toHaveTextContent(
      'content_hidden'
    );
  });

  it('reloads everything from the refresh control', async () => {
    const client = buildClient();
    await loadModeration(client);
    expect(client.fetchFlaggedQueue).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('moderation-refresh'));
    });
    await flushAllPendingWork();

    expect(client.fetchFlaggedQueue).toHaveBeenCalledTimes(2);
  });
});
