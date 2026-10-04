/**
 * The icon scale.
 *
 * Every lucide icon in the app is one of these seven sizes, chosen by the
 * role it plays rather than by file. Before this, icon size drifted by a
 * pixel or two between components doing the identical job — a Clock at 13
 * here, 14 there, 15 somewhere else, none of it intentional. At this size
 * the difference is invisible in isolation and only reads as sloppy once
 * two screens sit side by side, which is exactly how a real member
 * experiences the app: one tab after another.
 *
 * micro  — a glyph smaller than the text it sits inside (a chip's own badge)
 * xs     — beside text-xs metadata: dates, locations, counts
 * sm     — beside text-sm body, and inside every button — the workhorse
 * md     — a standalone small control: filter toggle, a lone icon button
 * lg     — a featured icon inside its own tile: category grid, bottom nav
 * xl     — chrome that anchors a screen: the back chevron, a FAB
 * xxl    — a large illustrative icon inside an empty or error state
 */
export const ICON = {
  micro: 12,
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,
} as const;
