import { fireEvent, screen } from '@testing-library/react-native';
import { createMockApiClient } from '@/api/mockClient';
import { ProfileScreen } from '@/screens/learner/ProfileScreen';
import { renderScreen } from '../helpers';

describe('ProfileScreen', () => {
  it('shows learner information, theme controls, and the community shortcut', async () => {
    renderScreen(ProfileScreen, { name: 'Profile', client: createMockApiClient({ latencyMs: 0 }) });
    expect(await screen.findByTestId('profile-name')).toBeTruthy();
    expect(screen.getByTestId('profile-email')).toBeTruthy();
    expect(screen.queryByTestId('profile-theme-options')).toBeNull();
    fireEvent.press(screen.getByTestId('profile-appearance-toggle'));
    expect(screen.getByTestId('profile-theme-options')).toBeTruthy();
    fireEvent.press(screen.getByTestId('profile-community'));
    expect(screen.getByTestId('profile-community')).toBeTruthy();
  });
});
