import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  LEARNER_TABS,
  LearnerTabBar,
} from '@/components/learner/LearnerTabBar';
import { minTouchTarget } from '@/theme/tokens';

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return style as Record<string, unknown>;
}

const renderWithSafeArea = (ui: React.ReactElement) => render(ui, { wrapper: ({ children }) => <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 375, height: 800 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}>{children}</SafeAreaProvider> });
describe('LearnerTabBar', () => {
  it('renders all 5 configured tabs with proper accessibility attributes', () => {
    const onSelect = jest.fn();
    renderWithSafeArea(<LearnerTabBar active="home" onSelect={onSelect} />);

    expect(screen.getByTestId('learner-tab-bar').props.accessibilityRole).toBe('tablist');

    for (const tab of LEARNER_TABS) {
      const tabElement = screen.getByTestId(`tab-${tab.key}`);
      expect(tabElement.props.accessibilityRole).toBe('tab');
      expect(flattenStyle(tabElement.props.style).minHeight).toBeGreaterThanOrEqual(
        minTouchTarget
      );
    }

    expect(screen.getByTestId('tab-home').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByTestId('tab-learning').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('renders wishlist badge count when wishlistCount > 0', () => {
    const onSelect = jest.fn();
    const { rerender } = renderWithSafeArea(
      <LearnerTabBar active="home" onSelect={onSelect} wishlistCount={0} />
    );

    expect(screen.queryByTestId('tab-wishlist-badge')).toBeNull();

    rerender(
      <LearnerTabBar active="home" onSelect={onSelect} wishlistCount={4} />
    );

    expect(screen.getByTestId('tab-wishlist-badge')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('calls onSelect when a tab is pressed', () => {
    const onSelect = jest.fn();
    renderWithSafeArea(<LearnerTabBar active="home" onSelect={onSelect} />);

    fireEvent.press(screen.getByTestId('tab-explore'));
    expect(onSelect).toHaveBeenCalledWith('explore');

    fireEvent.press(screen.getByTestId('tab-profile'));
    expect(onSelect).toHaveBeenCalledWith('profile');
  });
});

