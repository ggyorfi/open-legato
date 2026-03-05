export type PdfEntry = {
  filename: string
  title: string
  page_count: number
  sha256: string
}

export type DisplaySettings = {
  starts_on_left: boolean
}

export type ScoreManifest = {
  format_version: string
  pdfs: PdfEntry[]
  title?: string
  composer?: string
  tags?: string[]
  display: DisplaySettings
  created_at?: string
  modified_at?: string
  pdf_metadata?: Record<string, unknown>
}

export type LibraryEntry = {
  id: string
  title: string
  sha256: string
  created_at: string
  last_opened_at: string
}

export type RepeatButton = {
  id: string
  page: number
  target_page: number
  label: string
  offset_x: number
  offset_y: number
  size: number
}

export type NotesData = {
  format_version: string
  repeat_buttons: RepeatButton[]
}

export type ScoreRef = {
  scoreId: string
  manifest: ScoreManifest
}
