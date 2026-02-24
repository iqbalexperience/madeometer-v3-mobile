/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  _colorName: string
) {
  // We use a single light theme for now
  const colorFromProps = props['light'];
  return colorFromProps ?? Colors.textPrimary;
}
