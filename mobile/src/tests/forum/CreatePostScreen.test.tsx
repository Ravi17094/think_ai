import { act, fireEvent, screen } from '@testing-library/react-native';

import { TITLE_MIN_LENGTH } from '@/components/forum/CreatePostModal';
import { MAX_TAGS } from '@/components/forum/TagMultiSelect';
import { CreatePostScreen } from '@/screens/forum/CreatePostScreen';
import { createCommunityTestClient } from '@/tests/communityClientStub';
import { flushAllPendingWork, renderScreen } from '@/tests/helpers';

const CATEGORIES = [
  { id: 'cat-1', name: 'General Chat', slug: 'general-chat', color: '#6366f1' },
  { id: 'cat-2', name: 'Help Wanted', slug: 'help-wanted', color: '#22c55e' },
];

function buildClient() {
  const client = createCommunityTestClient({
    fetchDiscussionCategories: jest.fn().mockResolvedValue(CATEGORIES),
    fetchAllTags: jest.fn().mockResolvedValue(['jest', 'react', 'testing']),
    createDiscussion: jest.fn().mockResolvedValue({
      id: 't-new',
      notificationsCreated: 0,
    }),
  });
  return client;
}

function renderCreate(client: ReturnType<typeof createCommunityTestClient>) {
  return renderScreen(CreatePostScreen, { client, name: 'CreatePost' });
}

async function loadForm(client: ReturnType<typeof createCommunityTestClient>) {
  renderCreate(client);
  await flushAllPendingWork();
}

function fillValidForm() {
  fireEvent.changeText(
    screen.getByTestId('create-post-title'),
    'How do I mock the API?'
  );
  fireEvent.changeText(
    screen.getByTestId('create-post-body-input'),
    'Body with **bold** text'
  );
}

describe('CreatePostScreen', () => {
  it('shows the skeleton while the taxonomy loads, then the form', async () => {
    const client = buildClient();
    renderCreate(client);

    expect(screen.getByTestId('create-post-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('create-post-title')).toBeNull();

    await flushAllPendingWork();

    expect(screen.queryByTestId('create-post-skeleton')).toBeNull();
    expect(screen.getByTestId('create-post-title')).toBeTruthy();
    expect(screen.getByTestId('create-post-category')).toBeTruthy();
    expect(screen.getByTestId('create-post-body')).toBeTruthy();
    expect(screen.getByTestId('create-post-tags')).toBeTruthy();
  });

  it('shows an error state when the form options fail to load', async () => {
    const client = buildClient();
    (client.fetchDiscussionCategories as jest.Mock).mockRejectedValueOnce(
      new Error('Forum offline')
    );
    renderCreate(client);
    await flushAllPendingWork();

    expect(screen.getByTestId('create-post-error')).toBeTruthy();
    expect(screen.getByTestId('create-post-error-message')).toHaveTextContent(
      'Forum offline'
    );
  });

  it('validates the title and body inline', async () => {
    await loadForm(buildClient());

    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-submit'));
    });
    expect(screen.getByTestId('create-post-validation-error')).toHaveTextContent(
      `Add a title of at least ${TITLE_MIN_LENGTH} characters.`
    );

    fireEvent.changeText(screen.getByTestId('create-post-title'), 'Short');
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-submit'));
    });
    expect(screen.getByTestId('create-post-validation-error')).toHaveTextContent(
      `Add a title of at least ${TITLE_MIN_LENGTH} characters.`
    );

    fireEvent.changeText(
      screen.getByTestId('create-post-title'),
      'A title that is long enough'
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-submit'));
    });
    expect(screen.getByTestId('create-post-validation-error')).toHaveTextContent(
      'Add a body before posting.'
    );
    // The dialog never opens for an invalid form.
    expect(screen.queryByTestId('create-post-confirm')).toBeNull();
  });

  it('shows the live character hint under the title', async () => {
    await loadForm(buildClient());

    fireEvent.changeText(screen.getByTestId('create-post-title'), 'abc');
    expect(screen.getByTestId('create-post-title-hint')).toHaveTextContent(
      `3/${TITLE_MIN_LENGTH} characters minimum`
    );
  });

  it('picks a category through the dropdown', async () => {
    const client = buildClient();
    await loadForm(client);

    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-category-trigger'));
    });
    expect(screen.getByTestId('create-post-category-menu')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-category-option-cat-2'));
    });
    expect(screen.queryByTestId('create-post-category-menu')).toBeNull();
    expect(screen.getByTestId('create-post-category-trigger')).toHaveTextContent(
      'Help Wanted▼'
    );
  });

  it('adds and removes tags with a counter', async () => {
    await loadForm(buildClient());

    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-tags-option-jest'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-tags-option-react'));
    });
    expect(screen.getByTestId('create-post-tags-selected-jest')).toBeTruthy();
    expect(screen.getByTestId('create-post-tags-selected-react')).toBeTruthy();
    expect(screen.getByTestId('create-post-tags-counter')).toHaveTextContent(
      `2/${MAX_TAGS} tags`
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-tags-selected-jest'));
    });
    expect(screen.queryByTestId('create-post-tags-selected-jest')).toBeNull();
    expect(screen.getByTestId('create-post-tags-counter')).toHaveTextContent(
      `1/${MAX_TAGS} tags`
    );
  });

  it('wraps the selection with the bold toolbar button', async () => {
    await loadForm(buildClient());

    fireEvent.changeText(screen.getByTestId('create-post-body-input'), 'hello');
    fireEvent(screen.getByTestId('create-post-body-input'), 'selectionChange', {
      nativeEvent: { selection: { start: 5, end: 5 } },
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-body-tool-bold'));
    });

    expect(screen.getByTestId('create-post-body-input').props.value).toBe(
      'hello****'
    );
  });

  it('renders the preview modal and publishes through the confirm dialog', async () => {
    const client = buildClient();
    const navigation = renderCreate(client).navigation;
    await flushAllPendingWork();
    fillValidForm();

    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-preview'));
    });

    const modal = screen.getByTestId('post-preview-modal');
    expect(modal).toBeTruthy();
    expect(screen.getByTestId('post-preview-modal-title')).toHaveTextContent(
      'How do I mock the API?'
    );
    expect(screen.getByTestId('post-preview-modal-body')).toHaveTextContent(
      'Body with bold text'
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('post-preview-modal-publish'));
    });
    expect(screen.getByTestId('create-post-confirm')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-confirm-confirm'));
    });
    await flushAllPendingWork();

    expect(client.createDiscussion).toHaveBeenCalledWith({
      title: 'How do I mock the API?',
      body: 'Body with **bold** text',
      categoryId: 'cat-1',
      tags: [],
    });
    expect(navigation.navigate).toHaveBeenCalledWith('ForumThread', {
      threadId: 't-new',
    });
  });

  it('keeps the confirm dialog open with the error when posting fails', async () => {
    const client = buildClient();
    (client.createDiscussion as jest.Mock).mockRejectedValue(
      new Error('Forum offline')
    );
    renderCreate(client);
    await flushAllPendingWork();
    fillValidForm();

    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-submit'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-post-confirm-confirm'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('create-post-confirm-error')).toHaveTextContent(
      'Forum offline'
    );
    // The dialog stays up so the author can retry.
    expect(screen.getByTestId('create-post-confirm')).toBeTruthy();
  });
});
