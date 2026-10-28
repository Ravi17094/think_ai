import {
  calculateColumnWidth,
  calculateColumns,
} from '@/utils/responsive';

describe('calculateColumns', () => {
  it('returns a single column on a narrow phone', () => {
    expect(calculateColumns(340, 160, 12)).toBe(2);
  });

  it('returns one column when the container is narrower than the minimum', () => {
    expect(calculateColumns(120, 160, 12)).toBe(1);
  });

  it('grows the column count as the screen widens', () => {
    expect(calculateColumns(360, 160, 12)).toBe(2);
    expect(calculateColumns(700, 160, 12)).toBe(4);
    expect(calculateColumns(1024, 160, 12)).toBe(4);
  });

  it('never exceeds maxColumns', () => {
    expect(calculateColumns(2000, 160, 12, 4)).toBe(4);
    expect(calculateColumns(2000, 160, 12, 2)).toBe(2);
  });

  it('falls back to one column for a non-positive width', () => {
    expect(calculateColumns(0)).toBe(1);
    expect(calculateColumns(-50)).toBe(1);
  });
});

describe('calculateColumnWidth', () => {
  it('subtracts the gutters between columns', () => {
    expect(calculateColumnWidth(360, 2, 12)).toBe((360 - 12) / 2);
  });

  it('returns the full width for a single column', () => {
    expect(calculateColumnWidth(360, 1, 12)).toBe(360);
  });

  it('guards against a zero column count', () => {
    expect(calculateColumnWidth(360, 0)).toBe(360);
  });
});
