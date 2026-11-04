import { screen } from '@testing-library/react-native';
import { WishlistScreen } from '@/screens/learner/WishlistScreen';
import { renderScreen } from '../helpers';

describe('WishlistScreen', () => {
  it('shows the empty saved-courses state and Explore shortcut', async () => {
    renderScreen(WishlistScreen, { name: 'Wishlist' });
    expect(await screen.findByTestId('wishlist-empty')).toBeTruthy();
    expect(screen.getByTestId('tab-wishlist')).toBeTruthy();
  });
});
