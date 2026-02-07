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
import { type ButtonAction, defaultTouchButtons } from "./config/touchButtons"

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
  const pdfViewerRef = useRef<PdfViewerHandle>(null)

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

  const visibleButtons = defaultTouchButtons

  return (
    <>
      <TopToolbar
        pdfPath={pdfPath}
        onOpenPdf={setPdfPath}
        onOpenSettings={() => setSettingsOpen(true)}
        isVisible={toolbarVisible}
      />
      <PdfViewer
        ref={pdfViewerRef}
        pdfPath={pdfPath}
        onStartsOnLeftChange={setStartsOnLeft}
      />
      {visibleButtons.map((btn) => (
        <TouchButton
          key={btn.id}
          config={btn}
          onClick={() => handleButtonAction(btn.action)}
          visible={settings.showTouchButtons}
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
    </>
  )
}

export default App
