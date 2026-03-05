import { PdfViewer, type PdfViewerHandle } from "./components/PdfViewer"
import "./App.css"
import { invoke } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  start as keepAwakeStart,
  stop as keepAwakeStop,
} from "tauri-plugin-keepawake-api"
import { LibraryBrowser } from "./components/LibraryBrowser"
import { PointerDebugOverlay } from "./components/PointerDebugOverlay"
import { SettingsPopup } from "./components/SettingsPopup"
import { TopToolbar } from "./components/TopToolbar"
import { TouchButton } from "./components/TouchButton"
import { type AppSettings, loadSettings, saveSettings } from "./config/settings"
import {
  type ButtonAction,
  defaultTouchButtons,
  resolveButtons,
} from "./config/touchButtons"
import { useNotes } from "./hooks/useNotes"
import { usePageOrientation } from "./hooks/usePageOrientation"
import type {
  LibraryEntry,
  RepeatButton,
  ScoreManifest,
  ScoreRef,
} from "./types/library"

function App() {
  const [currentScore, setCurrentScore] = useState<ScoreRef | undefined>()
  const [scoreTitle, setScoreTitle] = useState<string>("")
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([])
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(true)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<AppSettings>({
    showTouchButtons: true,
    mirrorPagerButtons: false,
  })
  const [startsOnLeft, setStartsOnLeft] = useState<boolean | null>(null)
  const [editButtonsMode, setEditButtonsMode] = useState(false)
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false)
  const [selectedButtonId, setSelectedButtonId] = useState<string | null>(null)
  const [pinchSize, setPinchSize] = useState<number | null>(null)
  const [addRepeatMode, setAddRepeatMode] = useState(false)
  const [repeatPickerState, setRepeatPickerState] = useState<{
    page: number
    x: number
    y: number
  } | null>(null)
  const [pickerTargetPage, setPickerTargetPage] = useState("")
  const [pickerLabel, setPickerLabel] = useState("D.S.")
  const [editingRepeatButton, setEditingRepeatButton] =
    useState<RepeatButton | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editTargetPage, setEditTargetPage] = useState("")
  const [mirrorDragDelta, setMirrorDragDelta] = useState<{ x: number; y: number } | null>(null)
  const pdfViewerRef = useRef<PdfViewerHandle>(null)
  const isDraggingRef = useRef(false)
  const touchActiveRef = useRef(false)
  const initCancelledRef = useRef(false)

  const {
    notes,
    addRepeatButton,
    updateRepeatButton,
    deleteRepeatButton,
    shiftAllRepeatButtons,
  } = useNotes(currentScore?.scoreId)

  const dualPages = usePageOrientation() === "landscape"
  const pageNumOffset = dualPages && startsOnLeft === false ? 1 : 0
  const prevOffsetRef = useRef(pageNumOffset)
  useEffect(() => {
    const delta = prevOffsetRef.current - pageNumOffset
    prevOffsetRef.current = pageNumOffset
    if (delta !== 0 && notes.repeat_buttons.length > 0) {
      shiftAllRepeatButtons(delta)
    }
  }, [pageNumOffset, shiftAllRepeatButtons, notes.repeat_buttons.length])
  const toDisplayPage = useCallback(
    (internal: number) => internal + 1 + pageNumOffset,
    [pageNumOffset]
  )
  const toInternalPage = useCallback(
    (display: number) => display - 1 - pageNumOffset,
    [pageNumOffset]
  )
  const minDisplayPage = toDisplayPage(0)

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  useEffect(() => {
    if (isFullscreen) {
      keepAwakeStart({ display: true, idle: true, sleep: false }).catch(
        () => { }
      )
    } else {
      keepAwakeStop().catch(() => { })
    }
  }, [isFullscreen])

  const handleSettingsChange = (newSettings: AppSettings) => {
    if (newSettings.mirrorPagerButtons && !settings.mirrorPagerButtons) {
      const resolved = resolveButtons(defaultTouchButtons, newSettings.buttonOverrides)
      const left = resolved.find((b) => b.id === "prev-page")
      if (left) {
        newSettings = {
          ...newSettings,
          buttonOverrides: {
            ...newSettings.buttonOverrides,
            "next-page": {
              offsetX: left.offsetX,
              offsetY: left.offsetY,
              size: left.size,
            },
          },
        }
      }
    }
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  const refreshLibrary = useCallback(async () => {
    try {
      const entries = await invoke<LibraryEntry[]>("list_library")
      setLibraryEntries(entries)
      return entries
    } catch (err) {
      console.error("Failed to list library:", err)
      return []
    }
  }, [])

  const openScore = useCallback(async (scoreId: string) => {
    try {
      const manifest = await invoke<ScoreManifest>("open_score", { scoreId })
      setCurrentScore({ scoreId, manifest })
      setScoreTitle(manifest.title ?? "")
      setLibraryOpen(false)
    } catch (err) {
      console.error("Failed to open score:", err)
    }
  }, [])

  const importAndOpenPdf = useCallback(
    async (sourcePath: string) => {
      initCancelledRef.current = true
      try {
        const entry = await invoke<LibraryEntry>("import_pdf", { sourcePath })
        await refreshLibrary()
        await openScore(entry.id)
      } catch (err) {
        console.error("Failed to import PDF:", err)
      }
    },
    [refreshLibrary, openScore]
  )

  // Startup: ensure library, check CLI arg, auto-open last score or show library
  // biome-ignore lint/correctness/useExhaustiveDependencies: startup-only effect
  useEffect(() => {
    initCancelledRef.current = false

    const init = async () => {
      try {
        await invoke<string>("ensure_library")
      } catch (err) {
        console.error("Failed to ensure library:", err)
      }

      if (initCancelledRef.current) return

      const cliArg = await invoke<string | null>("get_cli_file_arg")

      if (initCancelledRef.current) return

      if (cliArg) {
        const lower = cliArg.toLowerCase()
        if (lower.endsWith(".pdf")) {
          await importAndOpenPdf(cliArg)
          return
        }
        if (lower.endsWith(".olscore")) {
          const filename = cliArg.split("/").pop() ?? ""
          const scoreId = filename.replace(".olscore", "")
          if (!initCancelledRef.current) await openScore(scoreId)
          return
        }
      }

      if (initCancelledRef.current) return

      const entries = await refreshLibrary()

      if (initCancelledRef.current) return

      if (import.meta.env.DEV && entries.length === 0) {
        await importAndOpenPdf(
          "/home/ggyorfi/Downloads/IMSLP638043-PMLP5700-Bartok.pdf"
        )
        return
      }

      if (entries.length > 0) {
        if (!initCancelledRef.current) await openScore(entries[0].id)
      } else if (!initCancelledRef.current) {
        setLibraryOpen(true)
      }
    }

    init()

    return () => {
      initCancelledRef.current = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const toggleFullscreen = async () => {
      const appWindow = getCurrentWindow()
      const current = await appWindow.isFullscreen()
      await appWindow.setFullscreen(!current)
      setIsFullscreen(!current)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault()
        toggleFullscreen()
      }
      if (e.key === "q" && e.ctrlKey) {
        e.preventDefault()
        setQuitConfirmOpen(true)
      }
    }

    let touchStart = 0
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 4) {
        touchStart = Date.now()
      }
    }
    const handleTouchEnd = (e: TouchEvent) => {
      if (
        touchStart &&
        e.touches.length === 0 &&
        Date.now() - touchStart < 400
      ) {
        touchStart = 0
        toggleFullscreen()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("touchstart", handleTouchStart)
    window.addEventListener("touchend", handleTouchEnd)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [])

  const handleButtonAction = (action: ButtonAction) => {
    switch (action) {
      case "nextPage":
        pdfViewerRef.current?.goNext()
        break
      case "prevPage":
        pdfViewerRef.current?.goPrev()
        break
      case "toggleToolbar":
        setToolbarVisible((v) => !v)
        break
    }
  }

  const resolvedButtons = resolveButtons(
    defaultTouchButtons,
    settings.buttonOverrides
  )

  const repeatButtonIds = new Set(notes.repeat_buttons.map((b) => b.id))

  const pagerMirror: Record<string, string> = {
    "prev-page": "next-page",
    "next-page": "prev-page",
  }

  const handleButtonMove = (id: string, offsetX: number, offsetY: number) => {
    const clamp = (v: number) => Math.max(0, Math.min(100, v))
    const overrides: Record<string, TouchButtonOverride> = {
      ...settings.buttonOverrides,
      [id]: {
        ...settings.buttonOverrides?.[id],
        offsetX: clamp(offsetX),
        offsetY: clamp(offsetY),
      },
    }
    const mirror = pagerMirror[id]
    if (settings.mirrorPagerButtons && mirror) {
      overrides[mirror] = {
        ...settings.buttonOverrides?.[mirror],
        offsetX: clamp(offsetX),
        offsetY: clamp(offsetY),
      }
    }
    handleSettingsChange({ ...settings, buttonOverrides: overrides })
  }

  const handleRepeatMove = (id: string, offsetX: number, offsetY: number) => {
    updateRepeatButton(id, { offset_x: offsetX, offset_y: offsetY })
  }

  const handleButtonResize = (id: string, newSize: number) => {
    if (repeatButtonIds.has(id)) {
      updateRepeatButton(id, { size: newSize })
    } else {
      const overrides: Record<string, TouchButtonOverride> = {
        ...settings.buttonOverrides,
        [id]: { ...settings.buttonOverrides?.[id], size: newSize },
      }
      const mirror = pagerMirror[id]
      if (settings.mirrorPagerButtons && mirror) {
        overrides[mirror] = { ...settings.buttonOverrides?.[mirror], size: newSize }
      }
      handleSettingsChange({ ...settings, buttonOverrides: overrides })
    }
  }

  const pinchRef = useRef({ initialDist: 0, baseSize: 0 })
  const pinchSizeRef = useRef<number | null>(null)
  const wheelSizeRef = useRef<number | null>(null)
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const handleButtonResizeRef = useRef(handleButtonResize)
  handleButtonResizeRef.current = handleButtonResize
  const findSizeRef = useRef((_id: string): number => 200)
  findSizeRef.current = (id: string) => {
    const tb = resolvedButtons.find((b) => b.id === id)
    if (tb) return tb.size
    const rb = notes.repeat_buttons.find((b) => b.id === id)
    return rb?.size ?? 200
  }

  useEffect(() => {
    const dist = (t: TouchList) => {
      const dx = t[1].clientX - t[0].clientX
      const dy = t[1].clientY - t[0].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const onTouchStart = (e: TouchEvent) => {
      touchActiveRef.current = true
      if (e.touches.length >= 2) {
        e.preventDefault()
        if (editButtonsMode && selectedButtonId) {
          pinchRef.current.initialDist = dist(e.touches)
          pinchRef.current.baseSize = findSizeRef.current(selectedButtonId)
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault()
        if (
          editButtonsMode &&
          selectedButtonId &&
          pinchRef.current.initialDist
        ) {
          const scale = dist(e.touches) / pinchRef.current.initialDist
          const newSize = Math.round(
            pinchRef.current.baseSize * Math.max(0.3, Math.min(3, scale))
          )
          const clamped = Math.max(100, Math.min(780, newSize))
          pinchSizeRef.current = clamped
          setPinchSize(clamped)
        }
      }
    }

    const onTouchEnd = () => {
      touchActiveRef.current = false
      if (pinchRef.current.initialDist && selectedButtonId) {
        pinchRef.current.initialDist = 0
        if (pinchSizeRef.current !== null) {
          handleButtonResizeRef.current(selectedButtonId, pinchSizeRef.current)
          pinchSizeRef.current = null
          setPinchSize(null)
        }
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (!editButtonsMode || !selectedButtonId || isDraggingRef.current || touchActiveRef.current) return
      const currentSize =
        wheelSizeRef.current ?? findSizeRef.current(selectedButtonId)
      const delta = e.deltaY > 0 ? -10 : 10
      const newSize = Math.max(100, Math.min(780, currentSize + delta))
      wheelSizeRef.current = newSize
      setPinchSize(newSize)
      clearTimeout(wheelTimeoutRef.current ?? undefined)
      wheelTimeoutRef.current = setTimeout(() => {
        handleButtonResizeRef.current(selectedButtonId, newSize)
        wheelSizeRef.current = null
        setPinchSize(null)
      }, 200)
    }

    window.addEventListener("touchstart", onTouchStart, { passive: false })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("wheel", onWheel)
    }
  }, [editButtonsMode, selectedButtonId])

  const handleAddRepeat = (page: number, x: number, y: number) => {
    setRepeatPickerState({ page, x, y })
    const defaultTarget = Math.max(1, toDisplayPage(page) - 1)
    setPickerTargetPage(String(defaultTarget))
    setPickerLabel("D.S.")
  }

  const confirmAddRepeat = () => {
    if (!repeatPickerState) return
    const targetPage = toInternalPage(Number.parseInt(pickerTargetPage, 10))
    if (Number.isNaN(targetPage) || targetPage < 0) return
    addRepeatButton({
      id: crypto.randomUUID(),
      page: repeatPickerState.page,
      target_page: targetPage,
      label: pickerLabel || "D.S.",
      offset_x: repeatPickerState.x,
      offset_y: repeatPickerState.y,
      size: 160,
    })
    setRepeatPickerState(null)
    setAddRepeatMode(false)
  }

  const openEditDialog = (rb: RepeatButton) => {
    setEditingRepeatButton(rb)
    setEditLabel(rb.label)
    setEditTargetPage(String(toDisplayPage(rb.target_page)))
  }

  const confirmEditRepeat = () => {
    if (!editingRepeatButton) return
    const targetPage = toInternalPage(Number.parseInt(editTargetPage, 10))
    if (Number.isNaN(targetPage) || targetPage < 0) return
    updateRepeatButton(editingRepeatButton.id, {
      label: editLabel || "D.S.",
      target_page: targetPage,
    })
    setEditingRepeatButton(null)
  }

  const confirmDeleteRepeat = () => {
    if (!editingRepeatButton) return
    deleteRepeatButton(editingRepeatButton.id)
    setEditingRepeatButton(null)
  }

  const handleOpenLibraryScore = async (entry: LibraryEntry) => {
    initCancelledRef.current = true
    await openScore(entry.id)
  }

  return (
    <>
      <TopToolbar
        scoreTitle={scoreTitle}
        onOpenLibrary={async () => {
          await refreshLibrary()
          setLibraryOpen(true)
        }}
        onOpenSettings={() => {
            setSettingsOpen(true)
            setEditButtonsMode(false)
            setSelectedButtonId(null)
          }}
        onQuit={() => setQuitConfirmOpen(true)}
        onToggleEditButtons={() => {
          setEditButtonsMode((v) => !v)
          setSelectedButtonId(null)
          setPinchSize(null)
        }}
        onToggleAddRepeat={() => setAddRepeatMode((v) => !v)}
        editButtonsMode={editButtonsMode}
        addRepeatMode={addRepeatMode}
        isVisible={toolbarVisible}
      />
      <PdfViewer
        ref={pdfViewerRef}
        scoreRef={currentScore}
        onStartsOnLeftChange={setStartsOnLeft}
        addRepeatMode={addRepeatMode}
        onAddRepeat={handleAddRepeat}
        repeatButtons={notes.repeat_buttons}
        showTouchButtons={settings.showTouchButtons}
        editButtonsMode={editButtonsMode}
        selectedButtonId={selectedButtonId}
        onSelectButton={setSelectedButtonId}
        repeatSizeOverride={pinchSize}
        onRepeatClick={(rb) => pdfViewerRef.current?.goToPage(rb.target_page)}
        onRepeatDetails={openEditDialog}
        onRepeatMove={handleRepeatMove}
        onDragStart={() => {
          isDraggingRef.current = true
        }}
        onDragEnd={() => {
          isDraggingRef.current = false
        }}
      />
      {resolvedButtons.map((btn) => {
        const isMirrorSelected =
          settings.mirrorPagerButtons &&
          selectedButtonId === pagerMirror[btn.id]
        const isSelected = selectedButtonId === btn.id || isMirrorSelected
        return (
        <TouchButton
          key={btn.id}
          config={btn}
          onClick={() => handleButtonAction(btn.action)}
          visible={settings.showTouchButtons}
          editMode={editButtonsMode}
          selected={isSelected}
          onSelect={() => setSelectedButtonId(btn.id)}
          onMove={(x, y) => handleButtonMove(btn.id, x, y)}
          onDragMove={
            settings.mirrorPagerButtons && pagerMirror[btn.id]
              ? (dx, dy) => setMirrorDragDelta(dx === 0 && dy === 0 ? null : { x: -dx, y: dy })
              : undefined
          }
          onDragStart={() => {
            isDraggingRef.current = true
          }}
          onDragEnd={() => {
            isDraggingRef.current = false
          }}
          sizeOverride={isSelected ? pinchSize : null}
          dragDeltaOverride={isMirrorSelected ? mirrorDragDelta : null}
        />
        )
      })}
      {settingsOpen && (
        <SettingsPopup
          settings={settings}
          onSettingsChange={handleSettingsChange}
          documentSettings={
            currentScore && pdfViewerRef.current
              ? {
                startsOnLeft,
                setStartsOnLeft: pdfViewerRef.current.setStartsOnLeft,
                title: scoreTitle,
                onTitleChange: async (title: string) => {
                  setScoreTitle(title)
                  const updated = { ...currentScore.manifest, title }
                  await invoke("update_manifest", {
                    scoreId: currentScore.scoreId,
                    manifest: updated,
                  })
                },
              }
              : undefined
          }
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {libraryOpen && (
        <LibraryBrowser
          entries={libraryEntries}
          onOpenScore={handleOpenLibraryScore}
          onImportPdf={async () => {
            setLibraryOpen(false)
            // Small delay to let the library close before opening dialog
            setTimeout(() => {
              const toolbar = document.querySelector<HTMLButtonElement>(
                ".floating-toolbar .pill-button"
              )
              toolbar?.click()
            }, 100)
          }}
          onClose={() => setLibraryOpen(false)}
        />
      )}
      {repeatPickerState && (
        // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
        // biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop
        <div
          className="settings-backdrop"
          onClick={() => setRepeatPickerState(null)}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation on dialog container */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation on dialog container */}
          <div
            className="repeat-target-picker"
            onClick={(e) => e.stopPropagation()}
          >
            <p>Add Repeat Button</p>
            <label className="repeat-target-picker-field">
              <span>Label</span>
              <input
                type="text"
                value={pickerLabel}
                onChange={(e) => setPickerLabel(e.target.value)}
                placeholder="D.S."
              />
            </label>
            <div className="repeat-target-picker-field">
              <span>Jump to page</span>
              <div className="page-stepper">
                <button
                  type="button"
                  className="page-stepper-btn"
                  onClick={() => {
                    const cur =
                      Number.parseInt(pickerTargetPage, 10) || minDisplayPage
                    if (cur > minDisplayPage)
                      setPickerTargetPage(String(cur - 1))
                  }}
                  disabled={
                    !pickerTargetPage ||
                    Number.parseInt(pickerTargetPage, 10) <= minDisplayPage
                  }
                >
                  -
                </button>
                <span className="page-stepper-value">
                  {pickerTargetPage || "—"}
                </span>
                <button
                  type="button"
                  className="page-stepper-btn"
                  onClick={() => {
                    const cur =
                      Number.parseInt(pickerTargetPage, 10) ||
                      minDisplayPage - 1
                    setPickerTargetPage(String(cur + 1))
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <div className="quit-confirm-buttons">
              <button
                type="button"
                className="pill-button pill-button--secondary quit-confirm-btn"
                onClick={() => setRepeatPickerState(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pill-button quit-confirm-btn"
                onClick={confirmAddRepeat}
                disabled={
                  !pickerTargetPage ||
                  Number.parseInt(pickerTargetPage, 10) < minDisplayPage
                }
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      {editingRepeatButton && (
        // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
        // biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop
        <div
          className="settings-backdrop"
          onClick={() => setEditingRepeatButton(null)}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation on dialog container */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation on dialog container */}
          <div
            className="repeat-target-picker"
            onClick={(e) => e.stopPropagation()}
          >
            <p>Edit Repeat Button</p>
            <label className="repeat-target-picker-field">
              <span>Label</span>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="D.S."
              />
            </label>
            <div className="repeat-target-picker-field">
              <span>Jump to page</span>
              <div className="page-stepper">
                <button
                  type="button"
                  className="page-stepper-btn"
                  onClick={() => {
                    const cur =
                      Number.parseInt(editTargetPage, 10) || minDisplayPage
                    if (cur > minDisplayPage) setEditTargetPage(String(cur - 1))
                  }}
                  disabled={
                    !editTargetPage ||
                    Number.parseInt(editTargetPage, 10) <= minDisplayPage
                  }
                >
                  -
                </button>
                <span className="page-stepper-value">
                  {editTargetPage || "—"}
                </span>
                <button
                  type="button"
                  className="page-stepper-btn"
                  onClick={() => {
                    const cur =
                      Number.parseInt(editTargetPage, 10) || minDisplayPage - 1
                    setEditTargetPage(String(cur + 1))
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <div className="quit-confirm-buttons repeat-edit-buttons">
              <button
                type="button"
                className="pill-button pill-button--destructive quit-confirm-btn"
                onClick={confirmDeleteRepeat}
              >
                Delete
              </button>
              <button
                type="button"
                className="pill-button pill-button--secondary quit-confirm-btn"
                onClick={() => setEditingRepeatButton(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pill-button quit-confirm-btn"
                onClick={confirmEditRepeat}
                disabled={
                  !editTargetPage ||
                  Number.parseInt(editTargetPage, 10) < minDisplayPage
                }
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {!isFullscreen && <PointerDebugOverlay />}
      {quitConfirmOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
        // biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop
        <div
          className="settings-backdrop"
          onClick={() => setQuitConfirmOpen(false)}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation on dialog container */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation on dialog container */}
          <div className="quit-confirm" onClick={(e) => e.stopPropagation()}>
            <p>Quit Open Legato?</p>
            <div className="quit-confirm-buttons">
              <button
                type="button"
                className="pill-button pill-button--secondary quit-confirm-btn"
                onClick={() => setQuitConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pill-button pill-button--destructive quit-confirm-btn"
                onClick={() => getCurrentWindow().close()}
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
