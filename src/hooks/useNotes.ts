import { invoke } from "@tauri-apps/api/core"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Bookmark, NotesData, RepeatButton } from "../types/library"

const EMPTY_NOTES: NotesData = {
  format_version: "0.1",
  repeat_buttons: [],
  bookmarks: [],
  hidden_pages: [],
}

export function useNotes(scoreId: string | undefined) {
  const [notes, setNotes] = useState<NotesData>(EMPTY_NOTES)
  const scoreIdRef = useRef(scoreId)
  scoreIdRef.current = scoreId

  useEffect(() => {
    if (!scoreId) {
      setNotes(EMPTY_NOTES)
      return
    }
    invoke<NotesData>("read_notes", { scoreId })
      .then((data) =>
        setNotes({
          ...EMPTY_NOTES,
          ...data,
          bookmarks: data.bookmarks ?? [],
          hidden_pages: data.hidden_pages ?? [],
        })
      )
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

  const addBookmark = useCallback(
    (bm: Bookmark) => {
      setNotes((prev) => {
        const updated = { ...prev, bookmarks: [...prev.bookmarks, bm] }
        persist(updated)
        return updated
      })
    },
    [persist]
  )

  const updateBookmark = useCallback(
    (id: string, updates: Partial<Bookmark>) => {
      setNotes((prev) => {
        const updated = {
          ...prev,
          bookmarks: prev.bookmarks.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        }
        persist(updated)
        return updated
      })
    },
    [persist]
  )

  const deleteBookmark = useCallback(
    (id: string) => {
      setNotes((prev) => {
        const updated = {
          ...prev,
          bookmarks: prev.bookmarks.filter((b) => b.id !== id),
        }
        persist(updated)
        return updated
      })
    },
    [persist]
  )

  const shiftAllBookmarks = useCallback(
    (delta: number) => {
      setNotes((prev) => {
        const updated = {
          ...prev,
          bookmarks: prev.bookmarks.map((b) => ({
            ...b,
            page: Math.max(0, b.page + delta),
          })),
        }
        persist(updated)
        return updated
      })
    },
    [persist]
  )

  const toggleHiddenPage = useCallback(
    (page: number) => {
      setNotes((prev) => {
        const hidden = prev.hidden_pages.includes(page)
          ? prev.hidden_pages.filter((p) => p !== page)
          : [...prev.hidden_pages, page].sort((a, b) => a - b)
        const updated = { ...prev, hidden_pages: hidden }
        persist(updated)
        return updated
      })
    },
    [persist]
  )

  return {
    notes,
    toggleHiddenPage,
    addRepeatButton,
    updateRepeatButton,
    deleteRepeatButton,
    shiftAllRepeatButtons,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    shiftAllBookmarks,
  }
}
