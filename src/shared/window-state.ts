export interface WindowState {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly maximized: boolean
}

export interface WorkArea {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface ResolvedBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface ResolveBoundsOptions {
  readonly minWidth: number
  readonly minHeight: number
}

export const MIN_WINDOW_WIDTH = 960
export const MIN_WINDOW_HEIGHT = 600

const MIN_VISIBLE_EDGE = 64

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isWindowState(value: unknown): value is WindowState {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isFiniteNumber(candidate['x']) &&
    isFiniteNumber(candidate['y']) &&
    isFiniteNumber(candidate['width']) &&
    isFiniteNumber(candidate['height']) &&
    typeof candidate['maximized'] === 'boolean'
  )
}

function hasVisibleEdge(candidate: WorkArea, workAreas: readonly WorkArea[]): boolean {
  return workAreas.some((area) => {
    const overlapWidth =
      Math.min(candidate.x + candidate.width, area.x + area.width) - Math.max(candidate.x, area.x)
    const overlapHeight =
      Math.min(candidate.y + candidate.height, area.y + area.height) - Math.max(candidate.y, area.y)

    return overlapWidth >= MIN_VISIBLE_EDGE && overlapHeight >= MIN_VISIBLE_EDGE
  })
}

export function resolveWindowBounds(
  saved: WindowState,
  workAreas: readonly WorkArea[],
  options: ResolveBoundsOptions
): ResolvedBounds {
  const primary = workAreas[0]
  const requestedWidth = Math.round(Math.max(options.minWidth, saved.width))
  const requestedHeight = Math.round(Math.max(options.minHeight, saved.height))

  if (primary === undefined) {
    return {
      x: Math.round(saved.x),
      y: Math.round(saved.y),
      width: requestedWidth,
      height: requestedHeight
    }
  }

  const width = Math.min(requestedWidth, primary.width)
  const height = Math.min(requestedHeight, primary.height)

  if (hasVisibleEdge({ x: saved.x, y: saved.y, width, height }, workAreas)) {
    return { x: Math.round(saved.x), y: Math.round(saved.y), width, height }
  }

  return {
    x: Math.round(primary.x + (primary.width - width) / 2),
    y: Math.round(primary.y + (primary.height - height) / 2),
    width,
    height
  }
}
