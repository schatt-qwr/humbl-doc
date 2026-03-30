---
sidebar_position: 1
title: PlatformFactory
---

# PlatformFactory

Runtime platform selection. Static factory methods return the correct concrete implementation for the current platform.

**File:** `humbl_core/lib/platform/platform_factory.dart`

## Static Methods

```dart
class PlatformFactory {
  static ISystemManager system();
  static IWifiManager wifi();
  static IBluetoothManager bluetooth();
  static ICellularManager cellular();
  static IConnectivityManager connectivity();
  static ICameraManager camera();
  static IMediaManager media();
  static IMicrophoneManager microphone();
  static ISensorManager sensor();
  static IContactsManager contacts();
  static IPhoneManager phone();
  static INotificationManager notifications();
  static ILocationManager location();
  static IHardwareInfoManager hardwareInfo();
  static IPermissionService permissions();
  static ITimerService timer();
  static IAlarmService alarm();
  static ICalendarService calendar();
  static IRoutineService routine();
  static IMeteredConnectionDetector meteredDetector();
  static IIntentsService intents();
  static IVisionService vision();
  static IAccessibilityService accessibility();
  static INfcManager nfc();
}
```

## Platform Resolution

Each method uses `Platform.isAndroid`, `Platform.isIOS`, etc. to select the implementation:

```dart
static IWifiManager wifi() {
  if (Platform.isAndroid) return AndroidWifiManager();
  if (Platform.isIOS) return IosWifiManager();
  if (Platform.isWindows) return WindowsWifiManager();
  if (Platform.isMacOS) return MacosWifiManager();
  if (Platform.isLinux) return LinuxWifiManager();
  throw UnsupportedError('WiFi not supported');
}
```

## Platform Coverage

| Manager | Android | iOS | Windows | macOS | Linux |
|---------|---------|-----|---------|-------|-------|
| System | Yes | Yes | Yes | Yes | Yes |
| WiFi | Yes | Yes | netsh | airport | nmcli |
| Bluetooth | Yes | Yes | PowerShell | blueutil | bluetoothctl |
| Cellular | Yes | Yes | Stub | Stub | Stub |
| Camera | Yes | Yes | Yes | Yes | Yes |
| Microphone | Yes | Yes | Yes | Yes | Yes |
| Sensors | Yes | Yes | Stub | Stub | Stub |
| Contacts | Native | Native | Yes | Yes | Yes |
| Phone | Yes | Yes | Stub | Stub | Stub |
| Notifications | Yes | Yes | Yes | Yes | Yes |
| Location | Yes | Yes | Yes | Yes | Yes |
| Media | Yes | Yes | Yes | Yes | Yes |
| Timer | Native | Native | Stub | Stub | Stub |
| Alarm | Native | Native | Stub | Stub | Stub |
| Calendar | Native | Native | Stub | Stub | Stub |
| Routine | Native | Native | Stub | Stub | Stub |

"Native" indicates Kotlin/Swift plugin with method channel. "Stub" indicates a no-op implementation that returns safe defaults.

## Usage

```dart
// At app startup (main.dart)
final system = PlatformFactory.system();
final wifi = PlatformFactory.wifi();
final bluetooth = PlatformFactory.bluetooth();
final camera = PlatformFactory.camera();
// ... pass to createToolRegistry()
```
