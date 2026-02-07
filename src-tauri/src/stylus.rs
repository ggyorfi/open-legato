use evdev::Device;
use serde::Serialize;
use std::os::fd::AsRawFd;

#[derive(Debug, Clone, Serialize)]
pub struct InputDeviceInfo {
    pub name: String,
    pub path: String,
    pub is_pen: bool,
    pub is_touch: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct StylusEvent {
    pub x: i32,
    pub y: i32,
    pub pressure: i32,
    pub tilt_x: i32,
    pub tilt_y: i32,
    pub touch_major: i32,
    pub event_type: String, // "down", "move", "up"
}

// Linux input event codes
const EV_SYN: u16 = 0;
const EV_KEY: u16 = 1;
const EV_ABS: u16 = 3;

// Absolute axis codes
const ABS_X: u16 = 0;
const ABS_Y: u16 = 1;
const ABS_PRESSURE: u16 = 24;
const ABS_TILT_X: u16 = 26;
const ABS_TILT_Y: u16 = 27;
const ABS_MT_TOUCH_MAJOR: u16 = 48;
const ABS_MT_POSITION_X: u16 = 53;
const ABS_MT_POSITION_Y: u16 = 54;
const ABS_MT_TRACKING_ID: u16 = 57;

// Key codes
const BTN_TOUCH: u16 = 330;

#[derive(Debug, Clone, Serialize)]
pub struct RawInputEvent {
    pub event_type: u16,
    pub code: u16,
    pub value: i32,
}

#[tauri::command]
pub fn list_input_devices() -> Vec<InputDeviceInfo> {
    let mut devices = Vec::new();

    if let Ok(entries) = std::fs::read_dir("/dev/input") {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(filename) = path.file_name() {
                let filename = filename.to_string_lossy();
                if filename.starts_with("event") {
                    if let Ok(device) = Device::open(&path) {
                        let name = device.name().unwrap_or("Unknown").to_string();
                        let name_lower = name.to_lowercase();
                        let is_pen = name_lower.contains("pen")
                            || name_lower.contains("stylus");
                        let is_touchpad = name_lower.contains("touchpad");
                        let is_mouse = name_lower.contains("mouse");
                        let is_touch = !is_touchpad && !is_mouse && (
                            name_lower.contains("touch")
                            || name_lower.contains("finger")
                            || name_lower.contains("elan")
                        );
                        devices.push(InputDeviceInfo {
                            name,
                            path: path.to_string_lossy().to_string(),
                            is_pen,
                            is_touch,
                        });
                    }
                }
            }
        }
    }

    devices
}

#[tauri::command]
pub fn find_stylus_device() -> Option<InputDeviceInfo> {
    // First try to find a pen, then fall back to touch for testing
    let devices = list_input_devices();
    devices.iter().find(|d| d.is_pen).cloned()
        .or_else(|| devices.iter().find(|d| d.is_touch).cloned())
}

#[tauri::command]
pub fn read_stylus_events(device_path: String) -> Result<Vec<StylusEvent>, String> {
    let mut device = Device::open(&device_path)
        .map_err(|e| format!("Failed to open device: {}", e))?;

    // Set non-blocking mode
    let fd = device.as_raw_fd();
    unsafe {
        let flags = libc::fcntl(fd, libc::F_GETFL);
        libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK);
    }

    let mut events = Vec::new();
    let mut current = StylusEvent {
        x: 0,
        y: 0,
        pressure: 0,
        tilt_x: 0,
        tilt_y: 0,
        touch_major: 0,
        event_type: "move".to_string(),
    };
    let mut is_touching = false;
    let mut pending_down = false;

    let start = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(3);

    while start.elapsed() < timeout && events.len() < 100 {
        match device.fetch_events() {
            Ok(evs) => {
                for ev in evs {
                    let ev_type = ev.event_type().0;
                    let code = ev.code();
                    let value = ev.value();

                    match ev_type {
                        EV_ABS => match code {
                            // Regular absolute axes (stylus)
                            ABS_X => current.x = value,
                            ABS_Y => current.y = value,
                            ABS_PRESSURE => current.pressure = value,
                            ABS_TILT_X => current.tilt_x = value,
                            ABS_TILT_Y => current.tilt_y = value,
                            // Multitouch axes (touchscreen)
                            ABS_MT_POSITION_X => current.x = value,
                            ABS_MT_POSITION_Y => current.y = value,
                            ABS_MT_TOUCH_MAJOR => current.touch_major = value,
                            ABS_MT_TRACKING_ID => {
                                if value == -1 {
                                    // Touch lifted
                                    current.event_type = "up".to_string();
                                    events.push(current.clone());
                                    is_touching = false;
                                }
                            }
                            _ => {}
                        },
                        EV_KEY => {
                            if code == BTN_TOUCH {
                                if value == 1 {
                                    pending_down = true;
                                    is_touching = true;
                                } else {
                                    current.event_type = "up".to_string();
                                    events.push(current.clone());
                                    is_touching = false;
                                }
                            }
                        },
                        EV_SYN => {
                            // Sync event = end of frame
                            if pending_down {
                                current.event_type = "down".to_string();
                                events.push(current.clone());
                                pending_down = false;
                            } else if is_touching && (current.x > 0 || current.y > 0) {
                                current.event_type = "move".to_string();
                                events.push(current.clone());
                            }
                        }
                        _ => {}
                    }
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
            Err(e) => {
                return Err(format!("Error reading events: {}", e));
            }
        }
    }

    Ok(events)
}

#[tauri::command]
pub fn read_raw_events(device_path: String) -> Result<Vec<RawInputEvent>, String> {
    let mut device = Device::open(&device_path)
        .map_err(|e| format!("Failed to open device: {}", e))?;

    // Set non-blocking mode
    let fd = device.as_raw_fd();
    unsafe {
        let flags = libc::fcntl(fd, libc::F_GETFL);
        libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK);
    }

    let mut events = Vec::new();
    let start = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(3);

    while start.elapsed() < timeout && events.len() < 50 {
        match device.fetch_events() {
            Ok(evs) => {
                for ev in evs {
                    events.push(RawInputEvent {
                        event_type: ev.event_type().0,
                        code: ev.code(),
                        value: ev.value(),
                    });
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
            Err(e) => {
                return Err(format!("Error reading events: {}", e));
            }
        }
    }

    Ok(events)
}
