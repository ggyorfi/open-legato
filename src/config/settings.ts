import {
  BaseDirectory,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs"

export type TouchButtonOverride = {
  offsetX?: number
  offsetY?: number
  size?: number
}

export type AppSettings = {
  showTouchButtons: boolean
  buttonOverrides?: Record<string, TouchButtonOverride>
}

const DEFAULT_SETTINGS: AppSettings = {
  showTouchButtons: true,
}

const SETTINGS_DIR = "open-legato"
const SETTINGS_PATH = `${SETTINGS_DIR}/settings.json`

export async function loadSettings(): Promise<AppSettings> {
  try {
    const content = await readTextFile(SETTINGS_PATH, {
      baseDir: BaseDirectory.Config,
    })
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) }
  } catch {
    // File doesn't exist or is invalid, return defaults
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await mkdir(SETTINGS_DIR, {
      baseDir: BaseDirectory.Config,
      recursive: true,
    })
    await writeTextFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), {
      baseDir: BaseDirectory.Config,
    })
  } catch (err) {
    console.error("Failed to save settings:", err)
  }
}
