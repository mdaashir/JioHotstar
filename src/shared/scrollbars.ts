/**
 * Hides scrollbars while keeping every scroll container scrollable.
 *
 * Deliberately avoids `overflow: hidden`, which would break scrolling outright.
 * Hiding the track and thumb leaves wheel, trackpad, keyboard, and touch
 * scrolling intact.
 */
export const HIDE_SCROLLBARS_CSS = `html, body, * {
  scrollbar-width: none !important;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar,
*::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}`
