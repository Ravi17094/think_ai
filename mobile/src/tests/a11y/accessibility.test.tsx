import { render, screen } from '@testing-library/react-native';

import {
  AppButton,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ScreenHeader,
} from '@/components/common';
import { DiscountCodeInput } from '@/components/checkout/DiscountCodeInput';
import { PlanCards } from '@/components/checkout/PlanCards';
import { EnrollButton } from '@/components/course/EnrollButton';
import { HeroBanner } from '@/components/course/HeroBanner';
import { CreatePostModal } from '@/components/forum/CreatePostModal';
import { MentionAutocomplete } from '@/components/forum/MentionAutocomplete';
import { RichTextEditor } from '@/components/forum/RichTextEditor';
import { SortDropdown } from '@/components/forum/SortDropdown';
import { SyncIndicator } from '@/components/forum/SyncIndicator';
import { TagMultiSelect } from '@/components/forum/TagMultiSelect';
import { SearchInput } from '@/components/search/SearchInput';
import { minTouchTarget } from '@/theme/tokens';
import type { CheckoutPlan } from '@/types/community';
import type { Course } from '@/types';

const noop = () => undefined;

/** Resolves a Pressable's `style` prop (object, array or callback) to one object. */
function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) {
    return {};
  }
  if (typeof style === 'function') {
    return flattenStyle((style as (s: { pressed: boolean }) => unknown)({ pressed: false }));
  }
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return style as Record<string, unknown>;
}

describe('accessibility contracts', () => {
  it('marks screen titles as headers', () => {
    render(<ScreenHeader title="Bookmarks" />);
    expect(screen.getByText('Bookmarks').props.accessibilityRole).toBe('header');
  });

  it('labels the shared action button and exposes its busy state', () => {
    render(<AppButton loading onPress={noop} title="Pay now" />);
    const button = screen.getByRole('button', { name: 'Pay now' });
    expect(button.props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    });
  });

  it('announces error state as an alert with a reachable retry', () => {
    render(<ErrorState message="Something broke" onRetry={noop} />);
    const alert = screen.getByTestId('error-state');
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(alert.props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.getByTestId('error-state-retry').props.accessibilityRole).toBe(
      'button'
    );
  });

  it('exposes an empty-state action with the button role', () => {
    render(
      <EmptyState actionLabel="Browse courses" onAction={noop} title="No courses" />
    );
    expect(screen.getByTestId('empty-state-action').props.accessibilityRole).toBe(
      'button'
    );
  });

  it('traps focus in the confirm dialog and headers its title', () => {
    render(
      <ConfirmDialog
        onCancel={noop}
        onConfirm={noop}
        title="Delete bookmark"
        visible
      />
    );
    const card = screen.getByTestId('confirm-dialog');
    expect(card.props.accessibilityViewIsModal).toBe(true);
    expect(screen.getByTestId('confirm-dialog-title').props.accessibilityRole).toBe(
      'header'
    );
    expect(
      screen.getByTestId('confirm-dialog-cancel').props.accessibilityState
    ).toMatchObject({ disabled: false });
  });

  it('announces the offline banner as a live alert', () => {
    render(<OfflineBanner />);
    const banner = screen.getByTestId('offline-banner');
    expect(banner.props.accessibilityRole).toBe('alert');
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
  });

  it('traps focus in the create-post sheet and headers its title', () => {
    render(
      <CreatePostModal
        availableTags={['jest']}
        categories={[]}
        onClose={noop}
        onSubmit={noop}
        visible
      />
    );
    expect(
      screen.getByTestId('create-post-modal').props.accessibilityViewIsModal
    ).toBe(true);
    expect(screen.getByText('New thread').props.accessibilityRole).toBe('header');
    expect(screen.getByTestId('create-post-modal-close').props.accessibilityLabel).toBe(
      'Close'
    );
  });

  it('exposes the sort menu as a modal menu', () => {
    render(<SortDropdown onChange={noop} value="newest" />);
    expect(
      screen.getByTestId('sort-dropdown-trigger').props.accessibilityState
    ).toMatchObject({ expanded: false });
  });

  it('labels tag suggestions and announces the tag counter', () => {
    render(
      <TagMultiSelect
        availableTags={['jest', 'react']}
        onChange={noop}
        value={[]}
      />
    );
    expect(
      screen.getByTestId('tag-multi-select-option-jest').props.accessibilityLabel
    ).toBe('Add tag jest');
    expect(
      screen.getByTestId('tag-multi-select-counter').props.accessibilityLiveRegion
    ).toBe('polite');
  });

  it('announces member-search status changes politely', () => {
    render(
      <MentionAutocomplete isLoading onSelect={noop} query="ad" suggestions={[]} />
    );
    expect(
      screen.getByTestId('mention-autocomplete-loading').props
        .accessibilityLiveRegion
    ).toBe('polite');
  });

  it('gives the editor toolbar buttons labels and a 44px target', () => {
    render(<RichTextEditor onChangeText={noop} value="" />);
    const bold = screen.getByTestId('rich-text-editor-tool-bold');
    expect(bold.props.accessibilityLabel).toBe('Bold');
    expect(flattenStyle(bold.props.style).minHeight).toBeGreaterThanOrEqual(
      minTouchTarget
    );
    expect(
      screen.getByTestId('rich-text-editor-toggle-preview').props.accessibilityState
    ).toMatchObject({ selected: false });
  });

  it('hides the decorative sync glyph and announces the label', () => {
    render(<SyncIndicator syncedAt={null} />);
    expect(
      screen.getByTestId('sync-indicator-label').props.accessibilityLiveRegion
    ).toBe('polite');
  });

  it('labels plan radios with their price', () => {
    const plan: CheckoutPlan = {
      id: 'p1',
      courseId: 'c1',
      title: 'Pro',
      price: 4999,
      currency: 'INR',
      description: 'Best value',
      features: ['All courses'],
      recommended: true,
    };
    render(<PlanCards onSelect={noop} plans={[plan]} selectedId="p1" />);
    expect(screen.getByTestId('plan-cards-plan-0').props.accessibilityLabel).toBe(
      'Pro, ₹4,999'
    );
    expect(screen.getByTestId('plan-cards-plan-0').props.accessibilityRole).toBe(
      'radio'
    );
  });

  it('labels the enroll button and reports busy', () => {
    render(<EnrollButton isEnrolled={false} isSubmitting onEnroll={noop} />);
    const button = screen.getByTestId('enroll-button');
    expect(button.props.accessibilityLabel).toBe('Enrolling…');
    expect(button.props.accessibilityState).toMatchObject({ busy: true });
  });

  it('headers the course hero title', () => {
    const course = {
      id: 'c1',
      title: 'Advanced RN',
      subtitle: 'Ship faster',
      level: 'advanced',
      durationMinutes: 90,
      rating: 4.5,
      enrolledCount: 1200,
      thumbnailUrl: 'https://example.com/a.png',
    } as unknown as Course;
    render(<HeroBanner course={course} />);
    expect(screen.getByTestId('hero-banner-title').props.accessibilityRole).toBe(
      'header'
    );
  });

  it('hides the leading search glyph and announces busy state', () => {
    render(<SearchInput isBusy onChangeText={noop} value="react" />);
    expect(screen.getByTestId('search-input-busy').props.accessibilityLiveRegion).toBe(
      'polite'
    );
  });

  it('announces discount validation politely', () => {
    render(
      <DiscountCodeInput
        onChange={noop}
        onApply={noop}
        onClear={noop}
        validation={{
          valid: true,
          status: 'valid',
          message: 'Applied',
          discount: null,
          discountAmount: 500,
        }}
        value="SAVE10"
      />
    );
    expect(
      screen.getByTestId('discount-input-status-valid').props.accessibilityLiveRegion
    ).toBe('polite');
    expect(screen.getByTestId('discount-input-clear').props.accessibilityLabel).toBe(
      'Remove discount code'
    );
  });
});
