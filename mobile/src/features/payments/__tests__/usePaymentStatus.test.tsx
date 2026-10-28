import { renderHook } from '@testing-library/react-native';

import { ApiClientProvider } from '@/hooks/useApiClient';
import { createCommunityTestClient } from '@/tests/communityClientStub';
import { flushAllPendingWork } from '@/tests/helpers';
import type { PaymentStatusResponse } from '../types';
import { usePaymentStatus } from '../hooks/usePaymentStatus';

function wrapperFor(client: ReturnType<typeof createCommunityTestClient>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <ApiClientProvider client={client}>{children}</ApiClientProvider>;
  };
}

function statusClient(
  responses: PaymentStatusResponse[] | Error[]
) {
  const fetchPaymentStatus = jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        responses.shift() ?? { status: 'pending' as const }
      )
    );
  return {
    client: createCommunityTestClient({ fetchPaymentStatus }),
    fetchPaymentStatus,
  };
}

describe('usePaymentStatus', () => {
  it('polls through the API client until the payment is confirmed', async () => {
    const { client, fetchPaymentStatus } = statusClient([
      { status: 'pending' },
      {
        status: 'confirmed',
        payment: {
          id: 'ord_1',
          planName: 'React',
          amount: 1180,
          currency: 'INR',
          transactionId: 'cfm_1',
          paidAt: '2026-10-23T10:00:00.000Z',
          courseId: 'course-1',
        },
      },
    ]);

    const { result } = renderHook(
      () => usePaymentStatus('ord_1', { intervalMs: 10, maxAttempts: 3 }),
      { wrapper: wrapperFor(client) }
    );

    await flushAllPendingWork(2);
    expect(result.current.status).toBe('polling');

    await flushAllPendingWork(3, 10);
    expect(fetchPaymentStatus).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('success');
    expect(result.current.payment?.transactionId).toBe('cfm_1');
  });

  it('reports a failed payment with its gateway failure code', async () => {
    const { client } = statusClient([
      { status: 'failed', failureCode: 'card_declined' },
    ]);

    const { result } = renderHook(() => usePaymentStatus('ord_2'), {
      wrapper: wrapperFor(client),
    });

    await flushAllPendingWork(2);
    expect(result.current.status).toBe('error');
    expect(result.current.failureCode).toBe('card_declined');
  });

  it('stops after maxAttempts and reports a timeout', async () => {
    const { client, fetchPaymentStatus } = statusClient([
      { status: 'pending' },
    ]);

    const { result } = renderHook(
      () => usePaymentStatus('ord_3', { intervalMs: 5, maxAttempts: 1 }),
      { wrapper: wrapperFor(client) }
    );

    await flushAllPendingWork(3, 5);
    expect(fetchPaymentStatus).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('timeout');
  });

  it('does not call the API without a payment id', async () => {
    const { client, fetchPaymentStatus } = statusClient([]);

    const { result } = renderHook(() => usePaymentStatus(null), {
      wrapper: wrapperFor(client),
    });

    await flushAllPendingWork();
    expect(fetchPaymentStatus).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });
});
