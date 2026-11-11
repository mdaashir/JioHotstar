export const PINNED_TITLE_SUFFIX = ' — Always on top'

export function composeWindowTitle(baseTitle: string, alwaysOnTop: boolean): string {
  return alwaysOnTop ? `${baseTitle}${PINNED_TITLE_SUFFIX}` : baseTitle
}
