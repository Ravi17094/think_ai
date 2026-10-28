import { render, screen } from '@testing-library/react-native';

import { AccessCourseButton } from '@/features/payments/components/AccessCourseButton';
import { ConfettiBurst } from '@/features/payments/components/ConfettiBurst';
import { EmailConfirmationNote } from '@/features/payments/components/EmailConfirmationNote';
import { ErrorIcon } from '@/features/payments/components/ErrorIcon';
import { FailureReason } from '@/features/payments/components/FailureReason';
import { ReceiptSummary } from '@/features/payments/components/ReceiptSummary';
import { RetryButton } from '@/features/payments/components/RetryButton';
import { SuccessCheckmark } from '@/features/payments/components/SuccessCheckmark';
import { SupportContactLink } from '@/features/payments/components/SupportContactLink';
import type { PaymentDetails } from '@/features/payments/types';
import { ChannelToggles } from '@/features/notifications/components/ChannelToggles';
import { PreferenceGroup } from '@/features/notifications/components/PreferenceGroup';
import { SaveButton } from '@/features/notifications/components/SaveButton';
import { UnsavedWarningModal } from '@/features/notifications/components/UnsavedWarningModal';
import type { GroupPrefs } from '@/features/notifications/types';
import { LazyThumbnail } from '@/features/forum/components/LazyThumbnail';
import { ThreadRow } from '@/features/forum/components/ThreadRow';
import type { Thread } from '@/features/forum/types';

const noop = () => undefined;

describe('payments accessibility', () => {
  it('gives the enroll CTA a meaningful, course-aware label', () => {
    render(
      <AccessCourseButton courseId="c1" courseTitle="React Basics" onPress={noop} />
    );
    expect(
      screen.getByRole('button', { name: 'Open enrolled course, React Basics' })
    ).toBeTruthy();
  });

  it('labels the retry button for screen readers', () => {
    render(<RetryButton onPress={noop} />);
    expect(screen.getByRole('button', { name: 'Retry payment' })).toBeTruthy();
  });

  it('exposes the receipt note as live text rather than a test id', () => {
    render(<EmailConfirmationNote email="learner@example.com" />);
    const note = screen.getByTestId('email-confirmation-note');
    expect(note).toHaveTextContent('Receipt sent to learner@example.com');
    expect(note.props.accessibilityLiveRegion).toBe('polite');
  });

  it('reads receipt rows instead of a synthetic container label', () => {
    const payment: PaymentDetails = {
      id: 'p1',
      planName: 'Pro',
      amount: 4999,
      currency: 'INR',
      transactionId: 'txn-1',
      paidAt: '2026-01-02T03:04:05.000Z',
      courseId: 'c1',
    };
    render(<ReceiptSummary p={payment} />);

    const card = screen.getByTestId('receipt-summary');
    expect(card.props.accessibilityLabel).toBeUndefined();
    expect(screen.getByText('Transaction ID')).toBeTruthy();
  });

  it('hides purely decorative success artwork', () => {
    render(
      <>
        <SuccessCheckmark />
        <ConfettiBurst />
      </>
    );

    expect(
      screen.getByTestId('success-checkmark', { includeHiddenElements: true }).props
        .accessibilityElementsHidden
    ).toBe(true);
    expect(
      screen.getByTestId('confetti-burst', { includeHiddenElements: true }).props
        .accessibilityElementsHidden
    ).toBe(true);
  });

  it('hides the failure glyph but headers the failure title', () => {
    render(
      <>
        <ErrorIcon type="declined" />
        <FailureReason type="declined" />
      </>
    );

    expect(
      screen.getByTestId('error-icon-declined', { includeHiddenElements: true })
        .props.accessibilityElementsHidden
    ).toBe(true);
    expect(
      screen.getByTestId('failure-title-declined').props.accessibilityRole
    ).toBe('header');
  });

  it('exposes support contacts as labelled links', () => {
    render(<SupportContactLink />);

    expect(
      screen.getByRole('link', { name: 'Email support at support@example.com' })
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Call support at plus 1 800 555 1234' })
    ).toBeTruthy();
  });
});

describe('notifications accessibility', () => {
  const prefs: GroupPrefs = { email: true, inApp: false, sms: true };

  it('labels the save action and announces the saving state', () => {
    const { rerender } = render(<SaveButton onPress={noop} saving={false} />);
    expect(
      screen.getByRole('button', { name: 'Save notification preferences' })
    ).toBeTruthy();

    rerender(<SaveButton onPress={noop} saving />);
    expect(
      screen.getByTestId('save-preferences-saving').props.accessibilityLabel
    ).toBe('Saving notification preferences');
  });

  it('names each channel switch with its channel', () => {
    render(<ChannelToggles onChange={noop} value={prefs} />);

    expect(
      screen.getByRole('switch', { name: 'Email notifications' })
    ).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: 'In-App notifications' })
    ).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'SMS notifications' })).toBeTruthy();
  });

  it('headers each preference group', () => {
    render(
      <PreferenceGroup group="replies" onChannelChange={noop} value={prefs} />
    );
    expect(screen.getByText('Replies').props.accessibilityRole).toBe('header');
  });

  it('traps focus in the unsaved-changes dialog', () => {
    render(
      <UnsavedWarningModal onCancel={noop} onDiscard={noop} visible />
    );

    expect(
      screen.getByTestId('unsaved-warning-card').props.accessibilityViewIsModal
    ).toBe(true);
    expect(screen.getByText('Unsaved changes').props.accessibilityRole).toBe(
      'header'
    );
  });
});

describe('forum feature accessibility', () => {
  it('treats an unlabelled thumbnail as decorative and a labelled one as content', () => {
    const { rerender } = render(<LazyThumbnail uri="https://example.com/a.png" />);
    expect(screen.queryByLabelText('Thread thumbnail')).toBeNull();

    rerender(
      <LazyThumbnail
        accessibilityLabel="Thread thumbnail"
        uri="https://example.com/a.png"
      />
    );
    expect(screen.getByLabelText('Thread thumbnail')).toBeTruthy();
  });

  it('summarises a thread row for screen readers', () => {
    const thread: Thread = {
      id: 't1',
      title: 'How do I mock timers?',
      replies: 4,
      author: 'Asha',
    };
    render(<ThreadRow thread={thread} />);

    expect(
      screen.getByTestId('thread-row-t1').props.accessibilityLabel
    ).toBe('How do I mock timers?. 4 replies by Asha');
  });
});
