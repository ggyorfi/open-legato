import { invoke } from "@tauri-apps/api/core"
import { useCallback, useEffect, useRef, useState } from "react"
import type { NotesData, RepeatButton } from "../types/library"

export function useNotes(scoreId: string | undefined) {
  const [notes, setNotes] = useState<NotesData>({
    format_version: "0.1",
    repeat_buttons: [],
  })
  const scoreIdRef = useRef(scoreId)
  scoreIdRef.current = scoreId

  useEffect(() => {
    if (!scoreId) {
      setNotes({ format_version: "0.1", repeat_buttons: [] })
      return
    }
    invoke<NotesData>("read_notes", { scoreId })
      .then(setNotes)
      .catch(console.error)
  }, [scoreId])

  const persist = useCallback((updated: NotesData) => {
    const id = scoreIdRef.current
    if (!id) return
    invoke("save_notes", { scoreId: id, notes: updated }).catch(console.error)
  }, [])

  const addRepeatButton = useCallback(
    (btn: RepeatButton) => {
      setNotes((prev) => {
        const updated = {
          ...prev,
          repeat_buttons: [...prev.repeat_buttons, btn],
        }
        persist(updated)
        return updated
      })
    },
    [persist]
  )

  const updateRepeatButton = useCallback(
    (id: string, updates: Partial<RepeatButton>) => {
      setNotes((prev) => {
        const updated = {
          ...prev,
          repeat_buttons: prev.repeat_buttons.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        }
        persist(updated)
        return updated
      })
    },
    [persist]
  )

  const deleteRepeatButton = useCallback(
    (id: string) => {
      setNotes((prev) => {
        const updated = {
          ...prev,
          repeat_buttons: prev.repeat_buttons.filter((b) => b.id !== id),
        }
        persist(updated)
        return updated
      })
    },
    [persist]
  )

  const shiftAllRepeatButtons = useCallback(
    (delta: number) => {
      setNotes((prev) => {
        const updated = {
          ...prev,
          repeat_buttons: prev.repeat_buttons.map((b) => ({
            ...b,
            target_page: Math.max(0, b.target_page + delta),
          })),
        }
        persist(updated)
        return updated
      })
    },
    [persist]
  )

  return {
    notes,
    addRepeatButton,
    updateRepeatButton,
    deleteRepeatButton,
    shiftAllRepeatButtons,
  }
}
