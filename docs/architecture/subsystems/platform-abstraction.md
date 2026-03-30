---
sidebar_position: 4
title: Platform Abstraction
---

# Platform Abstraction

Every device capability in Humbl is accessed through an `I`-prefix interface. Concrete implementations are selected at runtime by `PlatformFactory` based on `Platform.isAndroid`, `Platform.isIOS`, etc. Tools receive managers via constructor injection and never depend on concrete platform implementations.

## Why Interface Isolation?

Tools need to toggle WiFi, capture photos, read sensors, send notifications, and access contacts. But **how** these operations work differs fundamentally per platform:

- Toggling WiFi on Android requires `WifiManager` via platform channels. On Windows, it shells out to `netsh`. On macOS, it calls `networksetup` or `airport`. On Linux, it uses `nmcli`.
- Reading contacts on Android uses `ContentResolver`. On iOS, it uses `CNContactStore`. On Windows, it uses Outlook COM automation. On macOS, it uses Contacts.app scripting. On Linux, it reads vCard files.
- Capturing a photo on Android uses CameraX. On iOS, AVFoundation. On Windows, Media Foundation. On macOS, AVFoundation again but with different APIs. On Linux, V4L2.

A tool that calls `IWifiManager.scan()` works identically on all platforms. The tool author never writes platform-conditional code. The tool never imports `AndroidWifiManager` or `WindowsWifiManager`. The interface is the contract, and the platform layer fulfills it.

This isolation is not just for cleanliness -- it is a testability requirement. The entire `humbl_core` test suite (509 tests) runs on the developer's desktop without Android, iOS, or any native SDK. Every platform manager is replaced with a mock or stub. If tools depended on concrete implementations, testing would require emulators, simulators, and native toolchains.

## How It Connects

The platform layer connects to the rest of the system through a three-step process at startup:

1. **`PlatformFactory` selects implementations.** Each static factory method checks `Platform.isAndroid`, `Platform.isIOS`, etc. and returns the correct concrete implementation. This is the only place in the entire codebase where platform conditionals appear.

2. **Results passed to `createToolRegistry()`.** The app's `main.dart` calls each factory method and passes the resulting managers into the tool bootstrap function. Tools receive their dependencies via constructor injection.

3. **Tools use only the interface.** `WifiScanTool` has a field `final IWifiManager _wifi`. It calls `_wifi.scan()` and processes the result. It does not know and cannot know which platform implementation is behind the interface.

## PlatformFactory

The factory provides static methods that return the correct implementation for the current platform:

```dart
class PlatformFactory {
  static ISystemManager system() {
    if (Platform.isAndroid) return AndroidSystemManager();
    if (Platform.isIOS) return IosSystemManager();
    if (Platform.isWindows) return WindowsSystemManager();
    if (Platform.isMacOS) return MacosSystemManager();
    if (Platform.isLinux) return LinuxSystemManager();
    throw UnsupportedError('Unsupported platform');
  }

  static IWifiManager wifi() { /* ... */ }
  static IBluetoothManager bluetooth() { /* ... */ }
  // ... 20+ more factory methods
}
```

The app calls these during startup and passes the resulting managers into `createToolRegistry()`:

```dart
// In main.dart startup
final wifiManager = PlatformFactory.wifi();
final btManager = PlatformFactory.bluetooth();
final cameraManager = PlatformFactory.camera();
// ...
final toolRegistry = createToolRegistry(
  wifi: wifiManager,
  bluetooth: btManager,
  camera: cameraManager,
  // ...
);
```

## Platform Interface Coverage

25+ interfaces with per-platform implementations:

| Interface | Android | iOS | Windows | macOS | Linux | Stub |
|-----------|---------|-----|---------|-------|-------|------|
| `ISystemManager` | Yes | Yes | Yes | Yes | Yes | -- |
| `IWifiManager` | Yes | Yes | Yes (netsh) | Yes (airport) | Yes (nmcli) | -- |
| `IBluetoothManager` | Yes | Yes | Yes (PowerShell) | Yes (blueutil) | Yes (bluetoothctl) | -- |
| `ICellularManager` | Yes | Yes | -- | -- | -- | Desktop stub |
| `IConnectivityManager` | Yes | Yes | Yes (netsh) | Yes (scutil) | Yes (nmcli) | -- |
| `ICameraManager` | Yes (CameraX) | Yes (AVFoundation) | Yes (Media Foundation) | Yes (AVFoundation) | Yes (V4L2) | Stub |
| `IMediaManager` | Yes (MediaSession) | Yes (MPMusicPlayer) | Yes (keybd_event) | Yes (osascript) | Yes (playerctl) | -- |
| `IMicrophoneManager` | Yes (AudioRecord) | Yes (AVAudioEngine) | Yes (WASAPI) | Yes (AVAudioEngine) | Yes (ALSA) | Stub |
| `ISensorManager` | Yes (SensorManager) | Yes (CoreMotion) | Yes (WinSensors) | Yes (CoreMotion) | Yes (sysfs IIO) | Stub |
| `IContactsManager` | Yes (ContentResolver) | Yes (CNContactStore) | Yes (Outlook COM) | Yes (Contacts.app) | Yes (vCard/EDS) | -- |
| `IPhoneManager` | Yes (TelecomManager) | Yes (CallKit) | -- | -- | -- | Desktop stub |
| `INotificationManager` | Yes (NotificationListener) | Yes (UNNotification) | Yes (Toast) | Yes (Notification Center) | Yes (D-Bus) | -- |
| `ILocationManager` | Yes (FusedLocation) | Yes (CLLocation) | Yes (WinGeo) | Yes (CLLocation) | Yes (GeoClue2) | -- |
| `IHardwareInfoManager` | Yes | Yes | Yes | Yes | Yes | Stub |
| `IPermissionService` | Mobile | Mobile | Desktop | Desktop | Desktop | -- |
| `ITimerService` | Yes (AlarmManager) | Yes (Foundation Timer) | -- | -- | -- | Stub |
| `IAlarmService` | Yes (AlarmManager) | Yes (UNCalendar) | -- | -- | -- | Stub |
| `ICalendarService` | Yes (CalendarContract) | Yes (EventKit) | -- | -- | -- | Stub |
| `IRoutineService` | Yes (SharedPrefs) | Yes (UserDefaults) | -- | -- | -- | Stub |
| `IIntentsService` | -- | -- | -- | -- | -- | Stub |
| `IVisionService` | -- | -- | -- | -- | -- | Stub |
| `IAccessibilityService` | -- | -- | -- | -- | -- | Stub |
| `INfcManager` | -- | -- | -- | -- | -- | Stub |
| `IMeteredConnectionDetector` | -- | -- | -- | -- | -- | Stub |

Interfaces marked "Stub" have platform-specific implementations planned but currently return no-op/default responses.

## Native Plugins

Platform-specific functionality that requires native code is implemented as Flutter method channel plugins with matched Kotlin (Android) and Swift (iOS) implementations:

### Kotlin Plugins (Android)

| Plugin | File | Responsibility |
|--------|------|---------------|
| `HumblCorePlugin` | `HumblCorePlugin.kt` | Main plugin entry, method channel router |
| `AlarmPlugin` | `AlarmPlugin.kt` | `AlarmManager.setAlarmClock()` scheduling |
| `BiometricPlugin` | `BiometricPlugin.kt` | Fingerprint/face authentication via BiometricPrompt |
| `BleCommandPlugin` | `BleCommandPlugin.kt` | K900 protocol BLE command transport |
| `CalendarPlugin` | `CalendarPlugin.kt` | CalendarContract read/write |
| `ExecuTorchPlugin` | `ExecuTorchPlugin.kt` | ExecuTorch on-device ML runtime |
| `LiteRtPlugin` | `LiteRtPlugin.kt` | TensorFlow Lite runtime |
| `RoutinePlugin` | `RoutinePlugin.kt` | Routine scheduling and persistence |
| `SttPlugin` | `SttPlugin.kt` | Android SpeechRecognizer binding |
| `TimerPlugin` | `TimerPlugin.kt` | CountDownTimer + notification integration |
| `TtsPlugin` | `TtsPlugin.kt` | Android TextToSpeech engine binding |

### Swift Plugins (iOS)

Every Kotlin plugin has a Swift equivalent with the same name and matching method channel interface:

| Plugin | File | Native API |
|--------|------|-----------|
| `HumblCorePlugin` | `HumblCorePlugin.swift` | Main entry, FlutterPlugin registration |
| `AlarmPlugin` | `AlarmPlugin.swift` | UNCalendarNotificationTrigger |
| `BiometricPlugin` | `BiometricPlugin.swift` | LAContext (Face ID / Touch ID) |
| `BleCommandPlugin` | `BleCommandPlugin.swift` | CoreBluetooth CBPeripheral commands |
| `CalendarPlugin` | `CalendarPlugin.swift` | EventKit EKEventStore |
| `ExecuTorchPlugin` | `ExecuTorchPlugin.swift` | ExecuTorch iOS framework |
| `LiteRtPlugin` | `LiteRtPlugin.swift` | TensorFlow Lite iOS framework |
| `RoutinePlugin` | `RoutinePlugin.swift` | UserDefaults + BGTaskScheduler |
| `SttPlugin` | `SttPlugin.swift` | SFSpeechRecognizer |
| `TimerPlugin` | `TimerPlugin.swift` | Foundation Timer + UNNotification |
| `TtsPlugin` | `TtsPlugin.swift` | AVSpeechSynthesizer |

## Stubs

`stubs.dart` provides fallback implementations for test environments and desktop platforms where native APIs are unavailable:

```dart
// stubs.dart -- zero-op implementations for unsupported platforms
class StubCameraManager implements ICameraManager { /* all methods return defaults */ }
class StubMicrophoneManager implements IMicrophoneManager { /* ... */ }
class StubSensorManager implements ISensorManager { /* ... */ }
class StubTimerService implements ITimerService { /* ... */ }
class StubAlarmService implements IAlarmService { /* ... */ }
// ...
```

Stubs are used in two scenarios:

1. **Desktop platforms** where mobile-only APIs have no equivalent (telephony, NFC, system alarms)
2. **Unit tests** where platform managers are mocked or stubbed to avoid native dependencies

Stubs follow a strict contract: they never throw, they return sensible defaults (empty lists for queries, `false` for toggle states, `null` for optional values), and they log a warning when called so developers know they are hitting a stub rather than a real implementation.

## Adding a New Platform Interface

To add support for a new device capability:

1. **Create the interface:** `humbl_core/lib/platform/<feature>/i_<feature>_manager.dart` -- define the methods that tools will call. Keep the interface minimal (only what tools need, not everything the platform API offers).

2. **Add per-platform implementations:** `android_<feature>_manager.dart`, `ios_<feature>_manager.dart`, etc. Each implementation wraps the platform-specific API (method channels for Android/iOS, process calls for desktop, system libraries for Linux).

3. **Add a stub:** `stub_<feature>_manager.dart` -- provides the fallback for unsupported platforms and tests.

4. **Add factory method to `PlatformFactory`** -- the conditional logic that selects the right implementation.

5. **If native code is needed**, add `<Feature>Plugin.kt` and `<Feature>Plugin.swift` -- register the method channel handler and implement the native API calls.

6. **Pass the manager to tools** that need it via `createToolRegistry()` -- add the new parameter to the bootstrap function and inject it into the relevant tool constructors.

7. **Export from `humbl_core.dart`** -- add the interface and any models to the library barrel so consumers can import them.

The key constraint: tools in step 6 receive the *interface*, not the implementation. The tool file never imports the platform-specific file. This is what makes the platform layer swappable and testable.

## Source Files

| Path | Purpose |
|------|---------|
| `humbl_core/lib/platform/platform_factory.dart` | Factory with 20+ static methods |
| `humbl_core/lib/platform/stubs.dart` | Fallback implementations |
| `humbl_core/lib/platform/<feature>/` | Interface + all implementations per feature |
| `humbl_core/android/src/main/kotlin/com/qwr/humbl/core/` | Kotlin native plugins |
| `humbl_core/ios/Classes/` | Swift native plugins |
