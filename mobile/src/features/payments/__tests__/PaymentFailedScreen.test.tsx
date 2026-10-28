import { fireEvent } from '@testing-library/react-native';

import { createCommunityTestClient } from '@/tests/communityClientStub';
import { renderScreen } from '@/tests/helpers';
import { PaymentFailedScreen } from '../screens/PaymentFailedScreen';
import { failureMessages } from '../failure';

describe('PaymentFailedScreen', () => {
  it('renders the mapped failure reason', () => {
    const screen = renderScreen(PaymentFailedScreen, {
      name: 'PaymentFailed',
      params: { reason: 'expired' },
      client: createCommunityTestClient(),
    });

    expect(screen.getByTestId('failure-title-expired')).toHaveTextContent(
      failureMessages.expired.title
    );
  });

  it('shows the gateway message and error code when provided', () => {
    const screen = renderScreen(PaymentFailedScreen, {
      name: 'PaymentFailed',
      params: {
        reason: 'declined',
        errorCode: 'card_declined',
        message: 'Your bank declined the transaction.',
      },
      client: createCommunityTestClient(),
    });

    expect(screen.getByTestId('failure-message')).toHaveTextContent(
      'Your bank declined the transaction.'
    );
    expect(screen.getByTestId('failure-code')).toHaveTextContent(
      /card_declined/
    );
  });

  it('retries checkout with the preserved form values', () => {
    const screen = renderScreen(PaymentFailedScreen, {
      name: 'PaymentFailed',
      params: {
        reason: 'declined',
        preserve: true,
        formValues: { planId: 'plan-1', costCenter: 'CC-42' },
      },
      client: createCommunityTestClient(),
    });

    fireEvent.press(screen.getByText('Retry Payment'));

    expect(screen.navigation.navigate).toHaveBeenCalledWith('Checkout', {
      formValues: { planId: 'plan-1', costCenter: 'CC-42' },
    });
  });

  it('starts a fresh checkout when no form values were preserved', () => {
    const screen = renderScreen(PaymentFailedScreen, {
      name: 'PaymentFailed',
      params: { reason: 'unknown' },
      client: createCommunityTestClient(),
    });

    fireEvent.press(screen.getByText('Retry Payment'));

    expect(screen.navigation.navigate).toHaveBeenCalledWith('Checkout');
  });

  it('has messages for every failure type', () => {
    expect(failureMessages.declined.title).toBeDefined();
    expect(failureMessages.insufficient_funds.title).toBeDefined();
    expect(failureMessages.expired.title).toBeDefined();
    expect(failureMessages.network.title).toBeDefined();
  });
});
