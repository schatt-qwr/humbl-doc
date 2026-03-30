---
sidebar_position: 1
title: IPeripheralProvider
---

# IPeripheralProvider

Interface for adding new peripheral devices to the Humbl ecosystem. Works for any form factor: glasses, hearing aids, voice pucks, earbuds, etc.

**File:** `humbl_core/lib/devices/sdk/i_peripheral_provider.dart`

## Interface

```dart
abstract class IPeripheralProvider {
  String get id;              // Globally unique, e.g. 'com.acme.puck.x1'
  String get displayName;     // Human-readable name for device picker
  PeripheralCapabilities get capabilities;

  bool canClaim(DiscoveredBleDevice device);
  Future<IConnectedDevice> connect(DiscoveredBleDevice device);
  Future<void> disconnect();
}
```

| Method | Description |
|--------|-------------|
| `canClaim()` | Returns true if a BLE advertisement belongs to this device (checks service UUIDs, name pattern, etc.) |
| `connect()` | Connects to the device and returns a ready `IConnectedDevice` |
| `disconnect()` | Called when user disconnects or grace period expires |

## PeripheralCapabilities

Declares exactly what the device can do:

```dart
class PeripheralCapabilities {
  final PeripheralType type;
  final bool hasCamera;
  final bool hasDisplay;
  final bool hasSpeaker;
  final bool hasMicrophone;
  final bool hasSensors;
  final bool hasInput;        // Touch, button, gesture
  final bool hasWifi;
  final int? displayWidth;
  final int? displayHeight;
  final String? displayType;  // 'oled', 'microled', 'lcd'
}
```

## DiscoveredBleDevice

Minimal BLE advertisement data passed during device discovery:

```dart
class DiscoveredBleDevice {
  final String advName;
  final String remoteId;
  final List<String> serviceUuids;
  final int? rssi;
}
```

## Built-in Providers

| Provider | ID | Type | Capabilities |
|----------|-----|------|-------------|
| Even G1 | `com.even.g1` | smartGlasses | Display, speaker, mic, touch input |
| Brilliant Frame | `com.brilliant.frame` | smartGlasses | Display, camera, mic |
| Humbl Glasses | `com.humbl.glasses.v1` | smartGlasses | Camera, display, speaker, mic, sensors |
| Simulated | `com.humbl.simulated` | simulated | All capabilities (for testing) |

## Shipping as a Package

Third-party providers ship as separate Dart packages:

```dart
// In package: humbl_device_acme
class AcmePuckProvider implements IPeripheralProvider {
  @override String get id => 'com.acme.puck.x1';
  @override String get displayName => 'Acme Puck X1';
  // ...
}

// At app startup
DeviceRegistry.instance.registerProvider(AcmePuckProvider());
```
