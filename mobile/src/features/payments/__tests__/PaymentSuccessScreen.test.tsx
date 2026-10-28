import { fireEvent } from '@testing-library/react-native';

import { createCommunityTestClient } from '@/tests/communityClientStub';
import { flushAllPendingWork, renderScreen } from '@/tests/helpers';
import type { PaymentDetails } from '../types';
import { PaymentSuccessScreen } from '../screens/PaymentSuccessScreen';

const payment: PaymentDetails = {
  id: 'ord_1',
  planName: 'React Native Pro',
  amount: 1180,
  currency: 'INR',
  transactionId: 'cfm_1',
  paidAt: '2026-10-23T10:00:00.000Z',
  courseId: 'course-1',
  courseTitle: 'React Native',
  receiptEmail: 'learner@example.com',
};

describe('PaymentSuccessScreen', () => {
  it('shows the receipt and course access once polling confirms payment', async () => {
    const fetchPaymentStatus = jest.fn().mockResolvedValue({
      status: 'confirmed',
      payment,
    });
    const client = createCommunityTestClient({ fetchPaymentStatus });

    const screen = renderScreen(PaymentSuccessScreen, {
      name: 'PaymentSuccess',
      params: { paymentId: 'ord_1' },
      client,
    });

    await flushAllPendingWork();

    expect(fetchPaymentStatus).toHaveBeenCalledWith('ord_1');
    expect(screen.getByTestId('receipt-summary')).toBeTruthy();
    expect(screen.getByText('React Native Pro')).toBeTruthy();

    fireEvent.press(screen.getByText('Open Enrolled Course'));
    expect(screen.navigation.navigate).toHaveBeenCalledWith('CourseDetail', {
      courseId: 'course-1',
    });
  });

  it('redirects to the failure screen when the gateway declines the payment', async () => {
    const fetchPaymentStatus = jest.fn().mockResolvedValue({
      status: 'failed',
      failureCode: 'card_declined',
    });
    const client = createCommunityTestClient({ fetchPaymentStatus });

    const screen = renderScreen(PaymentSuccessScreen, {
      name: 'PaymentSuccess',
      params: { paymentId: 'ord_2', formValues: { planId: 'plan-1' } },
      client,
    });

    await flushAllPendingWork();

    expect(screen.navigation.replace).toHaveBeenCalledWith('PaymentFailed', {
      reason: 'declined',
      errorCode: 'card_declined',
      preserve: true,
      message: undefined,
      formValues: { planId: 'plan-1' },
    });
  });

  it('redirects with network reason when polling times out', async () => {
    const fetchPaymentStatus = jest
      .fn()
      .mockResolvedValue({ status: 'pending' });
    const client = createCommunityTestClient({ fetchPaymentStatus });

    const screen = renderScreen(PaymentSuccessScreen, {
      name: 'PaymentSuccess',
      params: { paymentId: 'ord_3' },
      client,
    });

    await flushAllPendingWork(35, 2000);

    expect(screen.navigation.replace).toHaveBeenCalledWith('PaymentFailed', {
      reason: 'network',
      preserve: true,
    });
  });
});
