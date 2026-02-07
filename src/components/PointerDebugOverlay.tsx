import { invoke } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"

interface InputDeviceInfo {
  name: string
  path: string
  is_pen: boolean
  is_touch: boolean
}

interface RawInputEvent {
  event_type: number
  code: number
  value: number
}

interface StylusEvent {
  x: number
  y: number
  pressure: number
  tilt_x: number
  tilt_y: number
  touch_major: number
  event_type: string
}

export function PointerDebugOverlay() {
  const [visible, setVisible] = useState(false)
  const [stylusDevice, setStylusDevice] = useState<InputDeviceInfo | null>(null)
  const [allDevices, setAllDevices] = useState<InputDeviceInfo[]>([])
  const [rawEvents, setRawEvents] = useState<RawInputEvent[]>([])
  const [stylusEvents, setStylusEvents] = useState<StylusEvent[]>([])
  const [rustStatus, setRustStatus] = useState<string>("")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === "d") {
        setVisible((v) => !v)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const copyLogs = () => {
    const text = JSON.stringify(
      { device: stylusDevice, stylusEvents, rawEvents },
      null,
      2
    )
    navigator.clipboard.writeText(text)
  }

  const listAllDevices = async () => {
    setRustStatus("Listing all devices...")
    try {
      const devices = await invoke<InputDeviceInfo[]>("list_input_devices")
      setAllDevices(devices)
      setRustStatus(`Found ${devices.length} devices`)
    } catch (e) {
      setRustStatus(`Error: ${e}`)
    }
  }

  const findStylus = async () => {
    setRustStatus("Searching...")
    try {
      const device = await invoke<InputDeviceInfo | null>("find_stylus_device")
      setStylusDevice(device)
      setRustStatus(device ? `Found: ${device.name}` : "No stylus found")
    } catch (e) {
      setRustStatus(`Error: ${e}`)
    }
  }

  const readRawEvents = async () => {
    if (!stylusDevice) {
      setRustStatus("Find stylus first")
      return
    }
    setRustStatus("Reading raw events... touch screen now!")
    try {
      const events = await invoke<RawInputEvent[]>("read_raw_events", {
        devicePath: stylusDevice.path,
      })
      setRawEvents(events)
      setRustStatus(`Got ${events.length} raw events`)
    } catch (e) {
      setRustStatus(`Error: ${e}`)
    }
  }

  const readStylusEvents = async () => {
    if (!stylusDevice) {
      setRustStatus("Find stylus first")
      return
    }
    setRustStatus("Reading stylus events... draw now!")
    try {
      const events = await invoke<StylusEvent[]>("read_stylus_events", {
        devicePath: stylusDevice.path,
      })
      setStylusEvents(events)
      setRustStatus(`Got ${events.length} stylus events`)
    } catch (e) {
      setRustStatus(`Error: ${e}`)
    }
  }

  if (!visible) return null

  const btnStyle: React.CSSProperties = {
    background: "#444",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    cursor: "pointer",
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.9)",
        color: "#0f0",
        fontFamily: "monospace",
        fontSize: 14,
        padding: 20,
        zIndex: 9999,
        overflow: "auto",
      }}
    >
      <h2 style={{ color: "#fff", margin: "0 0 20px 0" }}>
        Pointer Debug{" "}
        <span style={{ fontSize: 12, color: "#888" }}>(Shift+D to close)</span>
      </h2>

      <div
        style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        <button type="button" onClick={listAllDevices} style={btnStyle}>
          List Devices
        </button>
        <button type="button" onClick={findStylus} style={btnStyle}>
          Find Stylus
        </button>
        <button type="button" onClick={readStylusEvents} style={btnStyle}>
          Read Stylus
        </button>
        <button type="button" onClick={readRawEvents} style={btnStyle}>
          Read Raw
        </button>
        <button type="button" onClick={copyLogs} style={btnStyle}>
          Copy Logs
        </button>
      </div>

      {rustStatus && (
        <div style={{ color: "#0ff", marginBottom: 10 }}>{rustStatus}</div>
      )}

      {allDevices.length > 0 && (
        <div style={{ marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
          <h3 style={{ color: "#fff", margin: "0 0 10px 0" }}>
            All Input Devices (click to select)
          </h3>
          <pre style={{ margin: 0, fontSize: 11 }}>
            {allDevices.map((d) => (
              <div
                key={d.path}
                role="option"
                aria-selected={stylusDevice?.path === d.path}
                tabIndex={0}
                onClick={() => {
                  setStylusDevice(d)
                  setRustStatus(`Selected: ${d.name}`)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setStylusDevice(d)
                    setRustStatus(`Selected: ${d.name}`)
                  }
                }}
                style={{
                  color: d.is_pen ? "#0f0" : d.is_touch ? "#ff0" : "#888",
                  cursor: "pointer",
                  padding: "2px 0",
                  background:
                    stylusDevice?.path === d.path
                      ? "rgba(255,255,255,0.2)"
                      : "transparent",
                }}
              >
                {d.is_pen ? "[PEN] " : d.is_touch ? "[TOUCH] " : ""}
                {d.name} → {d.path}
              </div>
            ))}
          </pre>
        </div>
      )}

      {stylusEvents.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: "#fff", margin: "0 0 10px 0" }}>
            Stylus Events ({stylusEvents.length})
          </h3>
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {stylusEvents.map((ev, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral debug display
                key={i}
                style={{
                  color:
                    ev.event_type === "down"
                      ? "#0f0"
                      : ev.event_type === "up"
                        ? "#f00"
                        : "#ff0",
                }}
              >
                {ev.event_type.padEnd(5)} x={ev.x} y={ev.y} p={ev.pressure}{" "}
                tilt=({ev.tilt_x},{ev.tilt_y}) size={ev.touch_major}
              </div>
            ))}
          </pre>
        </div>
      )}

      {rawEvents.length > 0 && (
        <div>
          <h3 style={{ color: "#fff", margin: "0 0 10px 0" }}>
            Raw Events ({rawEvents.length})
          </h3>
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              maxHeight: 150,
              overflowY: "auto",
            }}
          >
            {rawEvents.map((ev, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral debug display
              <div key={i}>
                type={ev.event_type} code={ev.code} value={ev.value}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  )
}
