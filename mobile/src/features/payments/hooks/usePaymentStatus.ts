import { useEffect, useRef, useState } from 'react';

import { useApiClient } from '@/hooks/useApiClient';
import type { PaymentStatusResponse } from '../types';

export interface PaymentStatusOptions {
  intervalMs?: number;
  maxAttempts?: number;
}

export type PaymentPollingStatus =
  | 'idle'
  | 'polling'
  | 'success'
  | 'timeout'
  | 'error';

/**
 * Polls `GET /api/payments/:id/status` through the shared API client.
 *
 * The payment gateway is asynchronous, so the success screen waits for a
 * terminal status while still showing the receipt it already has. Polling
 * stops on `confirmed/succeeded/completed`, on `failed/cancelled`, or after
 * `maxAttempts` (reported as `timeout`).
 */
export function usePaymentStatus(
  paymentId: string | null,
  opts: PaymentStatusOptions = {}
) {
  const client = useApiClient();
  const [data, setData] = useState<PaymentStatusResponse | null>(null);
  const [status, setStatus] = useState<PaymentPollingStatus>('idle');
  const [attempts, setAttempts] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!paymentId) {
      setStatus('idle');
      setData(null);
      setAttempts(0);
      attemptsRef.current = 0;
      return undefined;
    }

    let cancelled = false;
    attemptsRef.current = 0;
    setAttempts(0);
    setData(null);
    setStatus('polling');

    const poll = async () => {
      if (cancelled) return;
      if (attemptsRef.current >= (optsRef.current.maxAttempts ?? 30)) {
        setStatus('timeout');
        return;
      }

      try {
        const response = await client.fetchPaymentStatus(paymentId);
        if (cancelled) return;
        setData(response);
        const next = response.status;
        if (next === 'confirmed' || next === 'succeeded' || next === 'completed') {
          setStatus('success');
          return;
        }
        if (next === 'failed' || next === 'cancelled') {
          setStatus('error');
          return;
        }
      } catch {
        // A transient polling failure is retried until the attempt budget ends.
      }

      if (cancelled) return;
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      timer.current = setTimeout(
        poll,
        optsRef.current.intervalMs ?? 2000
      );
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [client, paymentId]);

  return {
    ...(data ?? {}),
    data,
    status,
    attempts,
  };
}

export default usePaymentStatus;
