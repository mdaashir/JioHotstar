export type WindowCommand = 'toggle-fullscreen' | 'toggle-always-on-top'

export interface KeyInput {
  readonly type: string
  readonly key: string
  readonly control: boolean
  readonly shift: boolean
  readonly alt: boolean
  readonly meta: boolean
}

function hasNoModifiers(input: KeyInput): boolean {
  return !input.control && !input.shift && !input.alt && !input.meta
}

export function matchWindowCommand(
  input: KeyInput,
  platform: NodeJS.Platform
): WindowCommand | null {
  if (input.type !== 'keyDown') {
    return null
  }

  const key = input.key.toLowerCase()

  if (platform === 'darwin') {
    if (input.meta && input.control && !input.alt && !input.shift && key === 'f') {
      return 'toggle-fullscreen'
    }

    if (input.meta && input.shift && !input.control && !input.alt && key === 't') {
      return 'toggle-always-on-top'
    }

    return null
  }

  if (input.key === 'F11' && hasNoModifiers(input)) {
    return 'toggle-fullscreen'
  }

  if (input.control && input.shift && !input.alt && !input.meta && key === 't') {
    return 'toggle-always-on-top'
  }

  return null
}
