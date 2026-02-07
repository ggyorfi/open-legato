import { PdfViewer, type PdfViewerHandle } from "./components/PdfViewer"
import "./App.css"
import { invoke } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useEffect, useRef, useState } from "react"
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

function App() {
  // Use sessionStorage to persist user's file selection across HMR in dev mode
  const [pdfPath, setPdfPath] = useState<string | undefined>(() => {
    if (import.meta.env.DEV) {
      return sessionStorage.getItem("dev_pdfPath") ?? undefined
    }
    return undefined
  })
  const [isFullscreen, setIsFullscreen] = useState(true)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<AppSettings>({
    showTouchButtons: true,
  })
  const [startsOnLeft, setStartsOnLeft] = useState<boolean | null>(null)
  const [editButtonsMode, setEditButtonsMode] = useState(false)
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false)
  const [selectedButtonId, setSelectedButtonId] = useState<string | null>(null)
  const [pinchSize, setPinchSize] = useState<number | null>(null)
  const pdfViewerRef = useRef<PdfViewerHandle>(null)
  const isDraggingRef = useRef(false)

  // Load settings on mount
  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  // Save settings when they change
  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  // Persist pdfPath to sessionStorage in dev mode (survives HMR)
  useEffect(() => {
    if (import.meta.env.DEV && pdfPath) {
      sessionStorage.setItem("dev_pdfPath", pdfPath)
    }
  }, [pdfPath])

  useEffect(() => {
    // Skip if we already have a path (from sessionStorage or previous selection)
    if (pdfPath) return

    invoke<string | null>("get_cli_file_arg").then((path) => {
      if (path) {
        setPdfPath(path)
      } else if (import.meta.env.DEV) {
        setPdfPath("/home/ggyorfi/Downloads/IMSLP638043-PMLP5700-Bartok.pdf")
      }
    })
  }, [pdfPath])

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
    settings.buttonOverrides,
  )

  const handleButtonMove = (id: string, offsetX: number, offsetY: number) => {
    const clamp = (v: number) => Math.max(0, Math.min(100, v))
    const newSettings: AppSettings = {
      ...settings,
      buttonOverrides: {
        ...settings.buttonOverrides,
        [id]: { ...settings.buttonOverrides?.[id], offsetX: clamp(offsetX), offsetY: clamp(offsetY) },
      },
    }
    handleSettingsChange(newSettings)
  }

  const handleButtonResize = (id: string, newSize: number) => {
    const newSettings: AppSettings = {
      ...settings,
      buttonOverrides: {
        ...settings.buttonOverrides,
        [id]: { ...settings.buttonOverrides?.[id], size: newSize },
      },
    }
    handleSettingsChange(newSettings)
  }

  // Prevent browser pinch-to-zoom globally, use for button resize in edit mode
  const pinchRef = useRef({ initialDist: 0, baseSize: 0 })
  const pinchSizeRef = useRef<number | null>(null)
  const wheelSizeRef = useRef<number | null>(null)
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {

    const dist = (t: TouchList) => {
      const dx = t[1].clientX - t[0].clientX
      const dy = t[1].clientY - t[0].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault()
        if (editButtonsMode && selectedButtonId) {
          pinchRef.current.initialDist = dist(e.touches)
          const btn = resolvedButtons.find((b) => b.id === selectedButtonId)
          pinchRef.current.baseSize = btn?.size ?? 200
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault()
        if (editButtonsMode && selectedButtonId && pinchRef.current.initialDist) {
          const scale = dist(e.touches) / pinchRef.current.initialDist
          const newSize = Math.round(pinchRef.current.baseSize * Math.max(0.3, Math.min(3, scale)))
          const clamped = Math.max(100, Math.min(780, newSize))
          pinchSizeRef.current = clamped
          setPinchSize(clamped)
        }
      }
    }

    const onTouchEnd = () => {
      if (pinchRef.current.initialDist && selectedButtonId) {
        pinchRef.current.initialDist = 0
        if (pinchSizeRef.current !== null) {
          handleButtonResize(selectedButtonId, pinchSizeRef.current)
          pinchSizeRef.current = null
          setPinchSize(null)
        }
      }
    }

    // Mouse wheel to resize selected button in edit mode
    const onWheel = (e: WheelEvent) => {
      if (!editButtonsMode || !selectedButtonId || isDraggingRef.current) return
      e.preventDefault()
      const btn = resolvedButtons.find((b) => b.id === selectedButtonId)
      if (!btn) return
      const currentSize = wheelSizeRef.current ?? btn.size
      const delta = e.deltaY > 0 ? -10 : 10
      const newSize = Math.max(100, Math.min(780, currentSize + delta))
      wheelSizeRef.current = newSize
      setPinchSize(newSize)
      clearTimeout(wheelTimeoutRef.current ?? undefined)
      wheelTimeoutRef.current = setTimeout(() => {
        handleButtonResize(selectedButtonId, newSize)
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
  }, [editButtonsMode, selectedButtonId, resolvedButtons, handleButtonResize])

  return (
    <>
      <TopToolbar
        pdfPath={pdfPath}
        onOpenPdf={setPdfPath}
        onOpenSettings={() => setSettingsOpen(true)}
        onQuit={() => setQuitConfirmOpen(true)}
        onToggleEditButtons={() => {
          setEditButtonsMode((v) => !v)
          setSelectedButtonId(null)
          setPinchSize(null)
        }}
        editButtonsMode={editButtonsMode}
        isVisible={toolbarVisible}
      />
      <PdfViewer
        ref={pdfViewerRef}
        pdfPath={pdfPath}
        onStartsOnLeftChange={setStartsOnLeft}
      />
      {resolvedButtons.map((btn) => (
        <TouchButton
          key={btn.id}
          config={btn}
          onClick={() => handleButtonAction(btn.action)}
          visible={settings.showTouchButtons}
          editMode={editButtonsMode}
          selected={selectedButtonId === btn.id}
          onSelect={() => setSelectedButtonId(btn.id)}
          onMove={(x, y) => handleButtonMove(btn.id, x, y)}
          onDragStart={() => { isDraggingRef.current = true }}
          onDragEnd={() => { isDraggingRef.current = false }}
          sizeOverride={selectedButtonId === btn.id ? pinchSize : null}
        />
      ))}
      {settingsOpen && (
        <SettingsPopup
          settings={settings}
          onSettingsChange={handleSettingsChange}
          documentSettings={
            pdfPath && pdfViewerRef.current
              ? {
                  startsOnLeft,
                  setStartsOnLeft: pdfViewerRef.current.setStartsOnLeft,
                }
              : undefined
          }
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {!isFullscreen && <PointerDebugOverlay />}
      {quitConfirmOpen && (
        <div className="settings-backdrop" onClick={() => setQuitConfirmOpen(false)}>
          <div className="quit-confirm" onClick={(e) => e.stopPropagation()}>
            <p>Quit Open Legato?</p>
            <div className="quit-confirm-buttons">
              <button type="button" className="pill-button pill-button--secondary quit-confirm-btn" onClick={() => setQuitConfirmOpen(false)}>Cancel</button>
              <button type="button" className="pill-button pill-button--destructive quit-confirm-btn" onClick={() => getCurrentWindow().close()}>Quit</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
