import { useMemo } from 'react';

import type { RootStackParamList } from '@/navigation/types';
import { FailureReasonKey } from '../failure';

export function usePaymentFailure(params?: RootStackParamList['PaymentFailed']) {
  const p = params ?? {};
  const reason: FailureReasonKey = p.reason || 'unknown';
  const errorCode = p.errorCode;
  const message = p.message;
  const preserve = !!p.preserve;
  const formValues = p.formValues ?? {};

  return useMemo(
    () => ({
      reason,
      errorCode,
      message,
      preserve,
      formValues,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reason, errorCode, message, preserve, JSON.stringify(formValues)]
  );
}
