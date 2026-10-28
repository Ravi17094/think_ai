import { calculateColumns } from '@/utils/responsive';

describe('smoke', () => {
  it('computes columns', () => {
    expect(calculateColumns(400, 160, 12)).toBe(2);
  });
});
