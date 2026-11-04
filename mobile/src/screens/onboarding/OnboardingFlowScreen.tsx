import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { GuidedTourOverlay } from '@/features/onboarding/components/GuidedTourOverlay';
import { setOnboardingCompleted } from '@/features/onboarding/utils/onboardingStorage';
import { useApiClient } from '@/hooks/useApiClient';
import { getSession } from '@/api/session';

import { RoleSelectionScreen, type UserRole } from './RoleSelectionScreen';
import { WelcomeCarouselScreen } from './WelcomeCarouselScreen';

interface Props {
  onFinish: () => void;
}

type Step = 'carousel' | 'role' | 'tour';

export function OnboardingFlowScreen({ onFinish }: Props) {
  const [step, setStep] = useState<Step>('carousel');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const client = useApiClient();

  const handleCarouselComplete = useCallback(() => {
    setStep('role');
  }, []);

  const handleSkipCarousel = useCallback(() => {
    setStep('role');
  }, []);

  const handleRoleSelected = useCallback(
    async (role: UserRole) => {
      setSelectedRole(role);
      try {
        const session = getSession();
        // Attempt to update user profile via PATCH /users/:id/profile
        if (client && 'updateUserProfile' in client) {
          await (client as any).updateUserProfile(session.userId, { role });
        } else {
          // Fallback: try direct API call pattern as specified
          await fetch(`/api/users/${session.userId}/profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
          });
        }
      } catch {
        // Continue even if API call fails
      }
      setStep('tour');
    },
    [client]
  );

  const handleTourDismiss = useCallback(async () => {
    await setOnboardingCompleted();
    onFinish();
  }, [onFinish]);

  return (
    <View style={{ flex: 1 }}>
      {step === 'carousel' && (
        <WelcomeCarouselScreen
          onComplete={handleCarouselComplete}
          onSkip={handleSkipCarousel}
        />
      )}
      {step === 'role' && <RoleSelectionScreen onRoleSelected={handleRoleSelected} />}
      {step === 'tour' && selectedRole && (
        <GuidedTourOverlay role={selectedRole} onDismiss={handleTourDismiss} />
      )}
    </View>
  );
}

export default OnboardingFlowScreen;
