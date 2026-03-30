---
sidebar_position: 2
title: Project Setup
---

# Project Setup

SDK versions, dependency management, and per-platform build instructions.

## SDK Versions

| Component | Version Constraint |
|-----------|-------------------|
| Dart SDK | `>=3.0.0, <4.0.0` (humbl_core), `^3.10.4` (humbl_app) |
| Flutter | 3.10+ |
| Android minSdk | 24 |
| Android targetSdk | 34 |
| iOS deployment target | 15.0 |
| Windows | Visual Studio 2022 |
| macOS | 13.0+ |

## Key Dependencies

### humbl_core

| Package | Version | Purpose |
|---------|---------|---------|
| `sqflite` | ^2.3.0 | SQLite for KV, journal, settings, conversations |
| `sqlite3` | ^2.4.0 | Direct SQLite for vector store |
| `sqlite_vector` | ^0.1.0 | sqlite-vec extension for similarity search |
| `flutter_blue_plus` | ^1.31.0 | BLE scanning and connection |
| `permission_handler` | ^11.3.0 | OS permission management |
| `logger` | ^2.0.0 | Console logging |
| `meta` | any | @nonVirtual, @protected annotations |
| `http` | ^1.0.0 | HTTP client for cloud APIs |

### humbl_app

| Package | Version | Purpose |
|---------|---------|---------|
| `supabase_flutter` | ^2.3.0 | Auth, Postgres, Edge Functions, storage |
| `flutter_secure_storage` | ^9.0.0 | Secure key vault |
| `humbl_core` | path | Core plugin dependency |

## Dependency Management

### Adding a dependency to humbl_core

```bash
cd humbl_core
flutter pub add <package_name>
```

Since humbl_core is a plugin, dependencies must be compatible with all target platforms.

### Path dependencies

humbl_app references humbl_core via path:

```yaml
# humbl_app/pubspec.yaml
dependencies:
  humbl_core:
    path: ../humbl_core
```

## Building Per Platform

### Android

```bash
cd humbl_app
flutter build apk --release
flutter build appbundle --release
```

### iOS

```bash
cd humbl_app
flutter build ios --release
```

### Windows

```bash
cd humbl_app
flutter build windows --release
```

### macOS

```bash
cd humbl_app
flutter build macos --release
```

### Linux

```bash
cd humbl_app
flutter build linux --release
```

## Native Plugin Development

Native Kotlin and Swift plugins live in:

- `humbl_core/android/src/main/kotlin/com/qwr/humbl/core/`
- `humbl_core/ios/Classes/`

### Android namespace

```
com.qwr.humbl.core
```

### Kotlin plugin structure

Each native plugin registers a method channel in `HumblCorePlugin.kt`:

```kotlin
class AlarmPlugin : MethodChannel.MethodCallHandler {
  companion object {
    fun register(messenger: BinaryMessenger) {
      val channel = MethodChannel(messenger, "com.qwr.humbl.core/alarm")
      channel.setMethodCallHandler(AlarmPlugin())
    }
  }
}
```

### Swift plugin structure

```swift
class AlarmPlugin: NSObject {
  static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(
      name: "com.qwr.humbl.core/alarm",
      binaryMessenger: registrar.messenger()
    )
    // ...
  }
}
```

## Analysis

Run static analysis on the full codebase:

```bash
cd humbl_core && dart analyze
cd humbl_app && dart analyze
```

Both packages should produce zero analysis issues on a clean build.
