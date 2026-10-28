import { Dimensions, PixelRatio } from 'react-native';

/**
 * Grid geometry helper.
 *
 * Kept as a pure function of (width, minColumnWidth, gutter) so the responsive
 * behaviour of `CourseGrid` is unit-testable without rendering a layout.
 */
export function calculateColumns(
  containerWidth: number,
  minColumnWidth = 160,
  gutter = 12,
  maxColumns = 4
): number {
  if (containerWidth <= 0) {
    return 1;
  }
  const usable = containerWidth + gutter;
  const raw = Math.floor(usable / (minColumnWidth + gutter));
  return Math.min(Math.max(raw, 1), maxColumns);
}

export function calculateColumnWidth(
  containerWidth: number,
  columns: number,
  gutter = 12
): number {
  if (columns <= 0) {
    return containerWidth;
  }
  const totalGutter = gutter * (columns - 1);
  return (containerWidth - totalGutter) / columns;
}

export function getScreenWidth(): number {
  return Dimensions.get('window').width;
}

export function getScreenHeight(): number {
  return Dimensions.get('window').height;
}

export function roundToPixel(value: number): number {
  return PixelRatio.roundToNearestPixel(value);
}
