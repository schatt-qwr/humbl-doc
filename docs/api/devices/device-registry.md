---
sidebar_position: 3
title: DeviceRegistry
---

# DeviceRegistry

Singleton registry for peripheral device discovery, provider management, and connection lifecycle.

**File:** `humbl_core/lib/devices/registry/device_registry.dart`

## Class Signature

```dart
class DeviceRegistry {
  static DeviceRegistry get instance;

  // Registration
  void registerProvider(IPeripheralProvider provider);
  List<IPeripheralProvider> get providers;

  // Scan
  Future<List<ClaimableDevice>> scan({
    Duration scanDuration = const Duration(seconds: 30),
    PeripheralType? filterType,
  });

  // Connection
  Future<IConnectedDevice?> connect(ClaimableDevice device);
  Future<void> disconnect({DisconnectReason reason = DisconnectReason.user});

  // State
  IConnectedDevice? get active;
  Stream<IConnectedDevice?> get activeDeviceStream;
}
```

## ClaimableDevice

A discovered BLE device that has been claimed by a registered provider:

```dart
class ClaimableDevice {
  final DiscoveredBleDevice ble;
  final IPeripheralProvider provider;
}
```

## Scan Flow

1. Start BLE scan via `flutter_blue_plus`.
2. For each discovered device, check all registered providers via `canClaim()`.
3. First provider to claim the device gets it.
4. Return deduplicated list of `ClaimableDevice` entries.
5. Optional `filterType` narrows results to a specific `PeripheralType`.

## Connection Lifecycle

1. **Connect:** Call `provider.connect(bleDevice)`. Returns `IConnectedDevice`.
2. **Active:** Device is set as the active device. `activeDeviceStream` emits.
3. **Disconnect:** User or timeout triggers `disconnect()`.
4. **Grace period:** Configurable delay before fully disconnecting (for brief BLE drops).
5. **Reconnect:** If connection drops, automatic reconnect is attempted during grace period.

## DisconnectReason

```dart
enum DisconnectReason {
  user,          // User explicitly disconnected
  timeout,       // Grace period expired
  bleError,      // BLE connection lost
  appBackground, // App went to background
  newDevice,     // Connecting to a different device
}
```

## PeripheralCompatibilityChecker

Filters tools by what the connected device supports:

```dart
class PeripheralCompatibilityChecker {
  static List<HumblTool> filterByCapabilities(
    List<HumblTool> tools,
    PeripheralCapabilities capabilities,
  );
}
```

A tool with `requiredCapabilities: {PeripheralCapabilityFlag.camera}` is filtered out if the connected device has `hasCamera: false`.
