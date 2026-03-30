---
sidebar_position: 2
title: Add a Platform Manager
---

# How to Add a Platform Manager

Add a new platform capability interface with per-platform implementations.

## Steps

### 1. Define the Interface

Create a new subdirectory under `platform/` and define the interface:

```dart
// humbl_core/lib/platform/brightness/i_brightness_manager.dart

abstract class IBrightnessManager {
  Future<double> getBrightness();
  Future<void> setBrightness(double value);
  Future<bool> isAutoBrightnessEnabled();
  Future<void> setAutoBrightness(bool enabled);
}
```

### 2. Create Per-Platform Implementations

```dart
// humbl_core/lib/platform/brightness/android_brightness_manager.dart
class AndroidBrightnessManager implements IBrightnessManager {
  @override
  Future<double> getBrightness() async {
    // Call Android method channel
    return 0.5;
  }
  // ...
}
```

```dart
// humbl_core/lib/platform/brightness/windows_brightness_manager.dart
class WindowsBrightnessManager implements IBrightnessManager {
  @override
  Future<double> getBrightness() async {
    // Call PowerShell or WMI
    return 0.5;
  }
  // ...
}
```

### 3. Create a Stub for Unsupported Platforms

```dart
// humbl_core/lib/platform/brightness/stub_brightness_manager.dart
class StubBrightnessManager implements IBrightnessManager {
  @override
  Future<double> getBrightness() async => 1.0;
  @override
  Future<void> setBrightness(double value) async {}
  @override
  Future<bool> isAutoBrightnessEnabled() async => false;
  @override
  Future<void> setAutoBrightness(bool enabled) async {}
}
```

### 4. Add to PlatformFactory

```dart
// In humbl_core/lib/platform/platform_factory.dart

static IBrightnessManager brightness() {
  if (Platform.isAndroid) return AndroidBrightnessManager();
  if (Platform.isIOS) return IosBrightnessManager();
  if (Platform.isWindows) return WindowsBrightnessManager();
  if (Platform.isMacOS) return MacosBrightnessManager();
  if (Platform.isLinux) return LinuxBrightnessManager();
  return StubBrightnessManager();
}
```

### 5. Export from humbl_core.dart

```dart
// In humbl_core/lib/humbl_core.dart
export 'platform/brightness/i_brightness_manager.dart';
```

### 6. Wire into Tool Registry (if tools need it)

Add the manager as a parameter to `createToolRegistry()`:

```dart
ToolRegistry createToolRegistry({
  // ... existing params ...
  required IBrightnessManager brightness,
}) {
  // Pass to any tools that need it
  registry.register(BrightnessControlTool(brightness: brightness));
}
```

### 7. Wire in App Startup

```dart
// In humbl_app/lib/main.dart
final brightness = PlatformFactory.brightness();
final registry = createToolRegistry(
  // ... existing params ...
  brightness: brightness,
);
```

## Directory Structure

```
platform/brightness/
  ├── i_brightness_manager.dart
  ├── android_brightness_manager.dart
  ├── ios_brightness_manager.dart
  ├── windows_brightness_manager.dart
  ├── macos_brightness_manager.dart
  ├── linux_brightness_manager.dart
  └── stub_brightness_manager.dart
```

## Naming Conventions

- Interface: `I` + `PascalCase` + `Manager` (e.g., `IBrightnessManager`)
- Implementations: `Platform` + `PascalCase` + `Manager` (e.g., `AndroidBrightnessManager`)
- Files: `snake_case.dart` (e.g., `android_brightness_manager.dart`)
