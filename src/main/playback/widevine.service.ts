import { components } from 'electron'

const READY_TIMEOUT_MS = 60_000

export async function whenPlaybackReady(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Timed out preparing the Widevine component'))
    }, READY_TIMEOUT_MS)
  })

  try {
    await Promise.race([components.whenReady(), timeout])
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }
}
