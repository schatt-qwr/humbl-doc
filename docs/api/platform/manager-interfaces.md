---
sidebar_position: 2
title: Manager Interfaces
---

# Platform Manager Interfaces

All 25+ `I`-prefix interfaces that define platform capabilities. Each interface lives in its own subfolder with per-platform implementations.

## Interface Table

| Interface | Path | Key Methods | Method Count |
|-----------|------|-------------|-------------|
| `ISystemManager` | `platform/manager/` | `getBatteryLevel()`, `getDeviceInfo()`, `restart()`, `shutdown()` | ~8 |
| `IWifiManager` | `platform/wifi/` | `isEnabled()`, `toggle()`, `scan()`, `connect()`, `disconnect()`, `getCurrentNetwork()` | ~8 |
| `IBluetoothManager` | `platform/bluetooth/` | `isEnabled()`, `toggle()`, `scan()`, `getPairedDevices()` | ~6 |
| `ICellularManager` | `platform/cellular/` | `isEnabled()`, `getSignalStrength()`, `getCarrierName()`, `toggleData()` | ~5 |
| `IConnectivityManager` | `platform/connectivity/` | `isConnected()`, `getType()`, `onConnectivityChanged` | ~4 |
| `ICameraManager` | `platform/camera/` | `takePhoto()`, `startVideoRecording()`, `stopVideoRecording()`, `getAvailableCameras()` | ~6 |
| `IMediaManager` | `platform/media/` | `getVolume()`, `setVolume()`, `playPause()`, `next()`, `previous()` | ~8 |
| `IMicrophoneManager` | `platform/microphone/` | `isAvailable()`, `startRecording()`, `stopRecording()`, `getLevel()` | ~5 |
| `ISensorManager` | `platform/sensors/` | `getAvailableSensors()`, `startListening()`, `stopListening()`, `onSensorData` | ~6 |
| `IContactsManager` | `platform/contacts/` | `getAll()`, `search()`, `getById()`, `create()`, `update()`, `delete()` | ~7 |
| `IPhoneManager` | `platform/phone/` | `call()`, `sendSms()`, `getCallLog()` | ~4 |
| `INotificationManager` | `platform/notifications/` | `show()`, `cancel()`, `getActive()`, `requestPermission()` | ~5 |
| `ILocationManager` | `platform/location/` | `getCurrentLocation()`, `startTracking()`, `stopTracking()`, `onLocationChanged` | ~5 |
| `IHardwareInfoManager` | `platform/hardware/` | `getCpuInfo()`, `getMemoryInfo()`, `getStorageInfo()`, `getThermalState()` | ~6 |
| `IPermissionService` | `permissions/` | `isGranted()`, `request()`, `checkAll()` | 3 |
| `ITimerService` | `platform/timer/` | `setTimer()`, `cancelTimer()`, `getActiveTimers()` | ~4 |
| `IAlarmService` | `platform/alarm/` | `setAlarm()`, `cancelAlarm()`, `getAlarms()` | ~4 |
| `ICalendarService` | `platform/calendar/` | `getEvents()`, `createEvent()`, `deleteEvent()`, `getCalendars()` | ~5 |
| `IRoutineService` | `platform/routine/` | `getRoutines()`, `createRoutine()`, `triggerRoutine()`, `deleteRoutine()` | ~5 |
| `IMeteredConnectionDetector` | `platform/connectivity/` | `isMetered()` | 1 |
| `IIntentsService` | `platform/intents/` | `launchUrl()`, `shareText()`, `shareFile()` | ~4 |
| `IVisionService` | `platform/vision/` | `classifyImage()`, `detectObjects()`, `ocrText()` | ~4 |
| `IAccessibilityService` | `platform/accessibility/` | `isScreenReaderActive()`, `announce()`, `getAccessibilitySettings()` | ~4 |
| `INfcManager` | `platform/nfc/` | `isAvailable()`, `read()`, `write()`, `onTagDiscovered` | ~4 |

## Interface Design Pattern

All interfaces follow the same pattern:

1. **Interface file** declares the contract with `I` prefix.
2. **Per-platform implementations** in the same directory.
3. **Stub implementation** provides safe defaults for unsupported platforms.
4. **PlatformFactory** selects the correct implementation at runtime.

```
platform/wifi/
  ├── i_wifi_manager.dart          # Interface
  ├── android_wifi_manager.dart    # Android implementation
  ├── ios_wifi_manager.dart        # iOS implementation
  ├── windows_wifi_manager.dart    # Windows (netsh)
  ├── macos_wifi_manager.dart      # macOS (airport)
  └── linux_wifi_manager.dart      # Linux (nmcli)
```

## Adding a New Interface

1. Create the `I*Manager` interface in a new subfolder.
2. Implement for each target platform.
3. Add a stub implementation for unsupported platforms.
4. Add a static factory method to `PlatformFactory`.
5. Export from `humbl_core.dart`.
6. Wire in `createToolRegistry()` if tools need it.

See the [How-To: Add a Platform Manager](../../guide/howto/add-a-platform-manager) guide for the full walkthrough.
