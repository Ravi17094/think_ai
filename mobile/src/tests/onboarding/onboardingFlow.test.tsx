import { render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WelcomeCarouselScreen } from '@/screens/onboarding/WelcomeCarouselScreen';
import { RoleSelectionScreen } from '@/screens/onboarding/RoleSelectionScreen';
import { GuidedTourOverlay } from '@/features/onboarding/components/GuidedTourOverlay';
import { isOnboardingCompleted, setOnboardingCompleted } from '@/features/onboarding/utils/onboardingStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('Onboarding Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows carousel with 3 slides and skip button', () => {
    const onComplete = jest.fn();
    const onSkip = jest.fn();
    const { getByTestId } = render(
      <WelcomeCarouselScreen onComplete={onComplete} onSkip={onSkip} />
    );

    expect(getByTestId('welcome-carousel')).toBeTruthy();
    expect(getByTestId('welcome-skip')).toBeTruthy();
    expect(getByTestId('welcome-slide-learn')).toBeTruthy();
  });

  it('allows skipping carousel', () => {
    const onComplete = jest.fn();
    const onSkip = jest.fn();
    const { getByTestId } = render(
      <WelcomeCarouselScreen onComplete={onComplete} onSkip={onSkip} />
    );

    fireEvent.press(getByTestId('welcome-skip'));
    expect(onSkip).toHaveBeenCalled();
  });

  it('navigates through carousel slides', () => {
    const onComplete = jest.fn();
    const onSkip = jest.fn();
    const { getByTestId } = render(
      <WelcomeCarouselScreen onComplete={onComplete} onSkip={onSkip} />
    );

    fireEvent.press(getByTestId('welcome-next'));
    fireEvent.press(getByTestId('welcome-next'));
    fireEvent.press(getByTestId('welcome-next'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('shows role cards for Learner, Instructor, TA, and Admin', () => {
    const onRoleSelected = jest.fn();
    const { getByTestId } = render(<RoleSelectionScreen onRoleSelected={onRoleSelected} />);

    expect(getByTestId('role-card-learner')).toBeTruthy();
    expect(getByTestId('role-card-instructor')).toBeTruthy();
    expect(getByTestId('role-card-ta')).toBeTruthy();
    expect(getByTestId('role-card-admin')).toBeTruthy();
  });

  it('enables continue button only after role selection', () => {
    const onRoleSelected = jest.fn();
    const { getByTestId } = render(<RoleSelectionScreen onRoleSelected={onRoleSelected} />);

    const continueBtn = getByTestId('role-continue');
    fireEvent.press(continueBtn);
    expect(onRoleSelected).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('role-card-learner'));
    fireEvent.press(continueBtn);
    expect(onRoleSelected).toHaveBeenCalledWith('learner');
  });

  it('shows guided tour overlay and dismisses it', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(<GuidedTourOverlay role="learner" onDismiss={onDismiss} />);

    expect(getByTestId('guided-tour')).toBeTruthy();
    expect(getByTestId('tour-skip')).toBeTruthy();
    expect(getByTestId('tour-next')).toBeTruthy();

    fireEvent.press(getByTestId('tour-skip'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('persists onboarding completion to AsyncStorage', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await setOnboardingCompleted();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@thinkzai/onboarding_completed', 'true');
  });

  it('checks onboarding completion status from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const completed = await isOnboardingCompleted();
    expect(completed).toBe(true);

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const notCompleted = await isOnboardingCompleted();
    expect(notCompleted).toBe(false);
  });
});
