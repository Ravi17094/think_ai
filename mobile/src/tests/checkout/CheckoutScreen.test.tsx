import { act, fireEvent, screen } from '@testing-library/react-native';

import { CheckoutScreen } from '@/screens/checkout/CheckoutScreen';
import {
  buildAttempts,
  buildConfirmation,
  buildPlan,
} from '@/tests/communityFixtures';
import { createCommunityTestClient } from '@/tests/communityClientStub';
import { flushAllPendingWork, renderScreen } from '@/tests/helpers';
import type { CardDetails } from '@/types/community';

const VALID_CARD: CardDetails = {
  number: '4242 4242 4242 4242',
  expiry: '12/30',
  cvv: '123',
  name: 'Ada Lovelace',
};

function buildClient(
  overrides: Parameters<typeof createCommunityTestClient>[0] = {}
) {
  return createCommunityTestClient({
    fetchPlans: jest
      .fn()
      .mockResolvedValue([
        buildPlan({ recommended: true }),
        buildPlan({
          id: 'plan-2',
          courseId: '2',
          title: 'Advanced React',
          price: 2000,
        }),
      ]),
    validateDiscountCode: jest.fn().mockResolvedValue({
      valid: true,
      status: 'valid',
      message: 'Code applied',
      discount: { code: 'SAVE10' },
      discountAmount: 100,
    }),
    createPaymentIntent: jest.fn().mockResolvedValue({
      id: 'pi_deferred_test',
      amount: 1180,
      currency: 'INR',
      courseId: '1',
      status: 'deferred',
      createdAt: '2026-10-07T10:00:00.000Z',
    }),
    confirmPayment: jest.fn().mockResolvedValue(buildConfirmation()),
    ...overrides,
  });
}

function renderCheckout(
  client: ReturnType<typeof createCommunityTestClient>,
  params?: { courseId?: string }
) {
  return renderScreen(CheckoutScreen, { client, name: 'Checkout', params });
}

async function loadCheckout(
  client: ReturnType<typeof createCommunityTestClient>,
  params?: { courseId?: string }
) {
  renderCheckout(client, params);
  await flushAllPendingWork();
}

async function fillValidCard() {
  fireEvent.changeText(
    screen.getByTestId('checkout-card-number'),
    '4242424242424242'
  );
  fireEvent.changeText(screen.getByTestId('checkout-card-expiry'), '1230');
  fireEvent.changeText(screen.getByTestId('checkout-card-cvv'), '123');
  fireEvent.changeText(screen.getByTestId('checkout-card-name'), 'Ada Lovelace');
  await flushAllPendingWork();
}

async function fillValidCardAndPay() {
  await fillValidCard();
  await act(async () => {
    fireEvent.press(screen.getByTestId('checkout-pay'));
  });
}

describe('CheckoutScreen — plans and totals', () => {
  it('shows the skeleton, then plans, summary and pay button', async () => {
    const client = buildClient();
    renderCheckout(client);

    expect(screen.getByTestId('checkout-skeleton')).toBeTruthy();

    await flushAllPendingWork();

    expect(screen.queryByTestId('checkout-skeleton')).toBeNull();
    expect(screen.getByTestId('plan-cards-plan-0')).toBeTruthy();
    expect(screen.getByTestId('plan-cards-plan-1')).toBeTruthy();
    expect(screen.getByTestId('checkout-header')).toHaveTextContent(
      /Intro to React · ₹1,180/
    );
    expect(screen.getByTestId('checkout-summary-total')).toHaveTextContent(
      '₹1,180'
    );
    expect(screen.getByTestId('checkout-summary-gst')).toHaveTextContent(
      '₹180'
    );
    expect(screen.getByTestId('checkout-pay')).toHaveTextContent('Pay ₹1,180');
  });

  it('shows an error state when plans fail, with a retry', async () => {
    const client = buildClient({
      fetchPlans: jest.fn().mockRejectedValue(new Error('Plans unavailable')),
    });
    renderCheckout(client);
    await flushAllPendingWork();

    expect(screen.getByTestId('checkout-error-message')).toHaveTextContent(
      'Plans unavailable'
    );

    (client.fetchPlans as jest.Mock).mockResolvedValue([buildPlan()]);
    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-error-retry'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('plan-cards-plan-0')).toBeTruthy();
  });

  it('switches the selected plan and recomputes totals', async () => {
    await loadCheckout(buildClient());

    await act(async () => {
      fireEvent.press(screen.getByTestId('plan-cards-plan-1'));
    });

    expect(screen.getByTestId('checkout-summary-total')).toHaveTextContent(
      '₹2,360'
    );
    expect(screen.getByTestId('checkout-header')).toHaveTextContent(
      /Advanced React · ₹2,360/
    );
  });

  it('preselects the plan matching the course route param', async () => {
    await loadCheckout(buildClient(), { courseId: '2' });

    expect(screen.getByTestId('checkout-summary-plan')).toHaveTextContent(
      '₹2,000'
    );
    expect(screen.getByTestId('checkout-header')).toHaveTextContent(
      /Advanced React/
    );
  });
});

describe('CheckoutScreen — validation', () => {
  it('blocks payment on an empty card and reveals field errors', async () => {
    await loadCheckout(buildClient());

    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-pay'));
    });

    expect(screen.getByTestId('checkout-form-error')).toHaveTextContent(
      'Fix the card details before paying.'
    );
    expect(screen.getByTestId('checkout-card-number-error')).toHaveTextContent(
      /valid card number/
    );
    expect(screen.getByTestId('checkout-card-expiry-error')).toHaveTextContent(
      /MM\/YY/
    );
    expect(screen.getByTestId('checkout-card-cvv-error')).toHaveTextContent(
      '3 or 4 digits.'
    );
    expect(screen.getByTestId('checkout-card-name-error')).toHaveTextContent(
      'Name on card is required.'
    );
    expect(screen.queryByTestId('checkout-confirm-message')).toBeNull();
  });

  it('formats the card fields while typing', async () => {
    await loadCheckout(buildClient());

    fireEvent.changeText(
      screen.getByTestId('checkout-card-number'),
      '4242424242424242'
    );
    fireEvent.changeText(screen.getByTestId('checkout-card-expiry'), '1230');
    fireEvent.changeText(screen.getByTestId('checkout-card-cvv'), '12a3');

    expect(screen.getByTestId('checkout-card-number').props.value).toBe(
      '4242 4242 4242 4242'
    );
    expect(screen.getByTestId('checkout-card-expiry').props.value).toBe(
      '12/30'
    );
    expect(screen.getByTestId('checkout-card-cvv').props.value).toBe('123');
  });

  it('rejects a malformed cost centre before the confirm dialog opens', async () => {
    await loadCheckout(buildClient());
    await fillValidCard();

    fireEvent.changeText(
      screen.getByTestId('checkout-cost-center-input'),
      'abc'
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-pay'));
    });

    expect(screen.getByTestId('checkout-cost-center-error')).toHaveTextContent(
      'Use the format AB-1234.'
    );
    expect(screen.getByTestId('checkout-form-error')).toHaveTextContent(
      'Fix the cost centre before paying.'
    );
    expect(screen.queryByTestId('checkout-confirm-message')).toBeNull();
  });
});

describe('CheckoutScreen — discount', () => {
  it('applies a valid code and updates the totals', async () => {
    const client = buildClient();
    await loadCheckout(client);

    fireEvent.changeText(screen.getByTestId('checkout-discount-field'), 'SAVE10');
    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-discount-apply'));
    });
    await flushAllPendingWork();

    expect(client.validateDiscountCode).toHaveBeenCalledWith({
      code: 'SAVE10',
      costCenter: undefined,
      amount: 1000,
    });
    expect(screen.getByTestId('checkout-discount-status-valid')).toBeTruthy();
    expect(screen.getByTestId('checkout-discount-message')).toHaveTextContent(
      'Code applied (₹100 off)'
    );
    expect(screen.getByTestId('checkout-summary-discount')).toHaveTextContent(
      '− ₹100'
    );
    expect(screen.getByTestId('checkout-summary-total')).toHaveTextContent(
      '₹1,062'
    );
  });

  it('shows the reason when the code is rejected', async () => {
    const client = buildClient({
      validateDiscountCode: jest.fn().mockResolvedValue({
        valid: false,
        status: 'expired',
        message: 'This code has expired',
        discount: null,
        discountAmount: 0,
      }),
    });
    await loadCheckout(client);

    fireEvent.changeText(screen.getByTestId('checkout-discount-field'), 'OLD10');
    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-discount-apply'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('checkout-discount-status-invalid')).toBeTruthy();
    expect(screen.getByTestId('checkout-discount-message')).toHaveTextContent(
      'This code has expired'
    );
    expect(screen.getByTestId('checkout-summary-total')).toHaveTextContent(
      '₹1,180'
    );
  });

  it('clears the discount back to full price', async () => {
    await loadCheckout(buildClient());

    fireEvent.changeText(screen.getByTestId('checkout-discount-field'), 'SAVE10');
    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-discount-apply'));
    });
    await flushAllPendingWork();

    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-discount-clear'));
    });

    expect(screen.queryByTestId('checkout-discount-status-valid')).toBeNull();
    expect(screen.getByTestId('checkout-summary-total')).toHaveTextContent(
      '₹1,180'
    );
  });
});

describe('CheckoutScreen — payment', () => {
  it('runs intent → confirm through the dialog and renders success', async () => {
    const client = buildClient();
    await loadCheckout(client);
    await fillValidCardAndPay();

    expect(screen.getByTestId('checkout-confirm-message')).toHaveTextContent(
      /You will be charged ₹1,180/
    );
    expect(screen.getByTestId('checkout-confirm-message')).toHaveTextContent(
      /card ending 4242/
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-confirm-confirm'));
    });
    await flushAllPendingWork();

    expect(client.createPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1180,
        currency: 'INR',
        courseId: '1',
      })
    );
    expect(client.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1180,
        currency: 'INR',
        userId: expect.any(String),
        card: VALID_CARD,
        orderId: expect.stringMatching(/^ord_/),
      })
    );
    expect(screen.getByTestId('checkout-success')).toBeTruthy();
    expect(screen.getByTestId('checkout-success-title')).toHaveTextContent(
      'Payment successful'
    );
    expect(screen.getByTestId('checkout-confirmation-id')).toHaveTextContent(
      'Confirmation: cfm_test'
    );
    expect(screen.queryByTestId('checkout-pay')).toBeNull();
  });

  it('navigates to the course from the success card', async () => {
    const client = buildClient();
    const { navigation } = renderCheckout(client);
    await flushAllPendingWork();
    await fillValidCardAndPay();
    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-confirm-confirm'));
    });
    await flushAllPendingWork();

    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-view-course'));
    });

    expect(navigation.navigate).toHaveBeenCalledWith('CourseDetail', {
      courseId: '1',
    });
  });

  it('renders a decline with its retry attempts', async () => {
    const client = buildClient({
      confirmPayment: jest.fn().mockResolvedValue(
        buildConfirmation({
          success: false,
          message: 'Your card was declined.',
          attempts: buildAttempts(),
          attemptsUsed: 2,
          enrollmentUnlocked: false,
        })
      ),
    });
    await loadCheckout(client);
    await fillValidCardAndPay();

    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-confirm-confirm'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('checkout-failure')).toBeTruthy();
    expect(screen.getByTestId('checkout-payment-error')).toHaveTextContent(
      'Your card was declined.'
    );
    expect(screen.getByTestId('checkout-attempts')).toBeTruthy();
    expect(screen.getByTestId('checkout-attempt-1')).toHaveTextContent(
      'Attempt 1: declined (card_declined)'
    );
    // The form stays editable for another try.
    expect(screen.getByTestId('checkout-pay')).toBeTruthy();
  });

  it('navigates to the failure screen with non-sensitive form values', async () => {
    const client = buildClient({
      confirmPayment: jest.fn().mockResolvedValue(
        buildConfirmation({
          success: false,
          failureCode: 'card_declined',
          message: 'Your card was declined.',
          attempts: buildAttempts(),
          attemptsUsed: 2,
          enrollmentUnlocked: false,
        })
      ),
    });
    const { navigation } = renderCheckout(client);
    await flushAllPendingWork();
    await fillValidCardAndPay();

    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-confirm-confirm'));
    });
    await flushAllPendingWork();

    expect(navigation.replace).toHaveBeenCalledWith(
      'PaymentFailed',
      expect.objectContaining({
        reason: 'declined',
        errorCode: 'card_declined',
        preserve: true,
        formValues: expect.objectContaining({
          planId: 'plan-1',
          cardNumber: '4242 4242 4242 4242',
          cardExpiry: '12/30',
          cardName: 'Ada Lovelace',
        }),
      })
    );
    const [, params] = navigation.replace.mock.calls[0];
    expect(params.formValues).not.toHaveProperty('cvv');
  });

  it('keeps the dialog open when the request itself fails', async () => {
    const client = buildClient({
      confirmPayment: jest.fn().mockRejectedValue(new Error('Network down')),
    });
    await loadCheckout(client);
    await fillValidCardAndPay();

    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-confirm-confirm'));
    });
    await flushAllPendingWork();

    expect(screen.getByTestId('checkout-confirm-error')).toHaveTextContent(
      'Network down'
    );
    expect(screen.queryByTestId('checkout-success')).toBeNull();
    expect(screen.queryByTestId('checkout-failure')).toBeNull();
  });

  it('cancels the confirm dialog without paying', async () => {
    const client = buildClient();
    await loadCheckout(client);
    await fillValidCardAndPay();

    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-confirm-cancel'));
    });

    expect(screen.queryByTestId('checkout-confirm-message')).toBeNull();
    expect(client.confirmPayment).not.toHaveBeenCalled();
  });

  it('sends the cost centre and discount code with the payment', async () => {
    const client = buildClient();
    await loadCheckout(client);
    await fillValidCard();

    fireEvent.changeText(
      screen.getByTestId('checkout-cost-center-input'),
      'AB-1234'
    );
    fireEvent.changeText(screen.getByTestId('checkout-discount-field'), 'SAVE10');
    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-discount-apply'));
    });
    await flushAllPendingWork();

    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-pay'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-confirm-confirm'));
    });
    await flushAllPendingWork();

    expect(client.createPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        costCenter: 'AB-1234',
        discountCode: 'SAVE10',
        amount: 1062,
      })
    );
    expect(client.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        costCenter: 'AB-1234',
        discountCode: 'SAVE10',
        discountValue: 100,
      })
    );
  });
});
