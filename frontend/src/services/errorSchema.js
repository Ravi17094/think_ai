// Global Business Domain Error Status Codes Registry
export const ErrorRegistry = {
  VALIDATION_ERROR: { code: 'VAL_400', message: 'Invalid field data inputs supplied.' },
  UNAUTHORIZED: { code: 'AUTH_401', message: 'Missing or expired user session credentials.' },
  FORBIDDEN: { code: 'PERM_403', message: 'Access denied due to account rules.' },
  NOT_FOUND: { code: 'RES_404', message: 'Requested database profile not found.' },
  INTERNAL_ERROR: { code: 'SYS_500', message: 'An unhandled exception hit the cluster core.' },
};

export const formatServerError = (errorResponse) => {
  const data = errorResponse?.data;
  return {
    code: data?.code || ErrorRegistry.INTERNAL_ERROR.code,
    message: data?.message || ErrorRegistry.INTERNAL_ERROR.message,
    metadata: data?.metadata || null,
    timestamp: data?.timestamp || new Date().toISOString(),
  };
};