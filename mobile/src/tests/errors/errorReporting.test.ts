import {
  __resetErrorReporterForTests,
  getErrorReporter,
  reportError,
  setErrorReporter,
  toError,
  type ErrorReport,
} from '@/utils/errorReporting';

describe('errorReporting', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    __resetErrorReporterForTests();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    __resetErrorReporterForTests();
  });

  it('returns the same Error instance it was given', () => {
    const original = new Error('nope');
    expect(toError(original)).toBe(original);
  });

  it('wraps thrown strings and arbitrary values', () => {
    expect(toError('bad').message).toBe('bad');
    expect(toError({ code: 500 }).message).toBe('{"code":500}');
  });

  it('reports through the default console reporter', () => {
    reportError(new Error('boom'), { context: 'root' });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0]?.[0]).toContain('root');
  });

  it('routes reports through an installed reporter with normalised fields', () => {
    const reports: ErrorReport[] = [];
    setErrorReporter((report) => reports.push(report));

    const returned = reportError('kaboom', {
      context: 'checkout',
      componentStack: 'at Checkout',
    });

    expect(getErrorReporter()).not.toBeUndefined();
    expect(reports).toHaveLength(1);
    const report = reports[0]!;
    expect(report.error).toBeInstanceOf(Error);
    expect(report.error.message).toBe('kaboom');
    expect(report.context).toBe('checkout');
    expect(report.componentStack).toBe('at Checkout');
    expect(Number.isNaN(Date.parse(report.occurredAt))).toBe(false);
    expect(returned).toBe(report.error);
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
