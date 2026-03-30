---
sidebar_position: 4
title: Add a Device Provider
---

# How to Add a Device Provider

Implement support for a new smart glasses or peripheral device.

## Steps

### 1. Implement IPeripheralProvider

```dart
// In a separate package: humbl_device_acme/lib/acme_provider.dart

class AcmePuckProvider implements IPeripheralProvider {
  @override
  String get id => 'com.acme.puck.x1';

  @override
  String get displayName => 'Acme Puck X1';

  @override
  PeripheralCapabilities get capabilities => const PeripheralCapabilities(
    type: PeripheralType.audioDevice,
    hasCamera: false,
    hasDisplay: false,
    hasSpeaker: true,
    hasMicrophone: true,
    hasSensors: false,
    hasInput: true,  // Button
    hasWifi: false,
  );

  @override
  bool canClaim(DiscoveredBleDevice device) {
    // Check BLE advertisement for your device's service UUID
    return device.serviceUuids.contains('0000abcd-0000-1000-8000-00805f9b34fb')
        || device.advName.startsWith('AcmePuck');
  }

  @override
  Future<IConnectedDevice> connect(DiscoveredBleDevice device) async {
    // Establish BLE connection
    // Discover GATT services
    // Return connected device
    return AcmePuckDevice(bleDevice: device);
  }

  @override
  Future<void> disconnect() async {
    // Clean up BLE connection
  }
}
```

### 2. Implement IConnectedDevice

```dart
class AcmePuckDevice implements IConnectedDevice {
  final DiscoveredBleDevice bleDevice;
  AcmePuckDevice({required this.bleDevice});

  @override
  String get deviceId => bleDevice.remoteId;

  @override
  String get displayName => 'Acme Puck X1';

  @override
  PeripheralCapabilities get capabilities =>
      const PeripheralCapabilities(/* ... */);

  @override
  Stream<PeripheralConnectionState> get connectionState =>
      _connectionController.stream;

  // Capability interfaces — null for unsupported
  @override ICameraCapability? get camera => null;
  @override IDisplayCapability? get display => null;
  @override IAudioCapability? get audio => _audioCapability;
  @override ISensorCapability? get sensors => null;
  @override IInputCapability? get input => _inputCapability;
}
```

### 3. Implement Capability Interfaces

Only implement the capabilities your device supports:

```dart
class AcmePuckAudio implements IAudioCapability {
  @override
  Future<void> playAudio(Uint8List pcmBytes) async {
    // Send audio to device via BLE
  }

  @override
  Stream<Uint8List> get microphoneStream {
    // Stream audio from device mic via BLE
  }
}
```

### 4. Register at App Startup

```dart
// In humbl_app/lib/main.dart
DeviceRegistry.instance.registerProvider(AcmePuckProvider());
```

### 5. Define Device Input Mappings

If your device has buttons or gestures:

```dart
List<DeviceInputMapping> get defaultInputMappings => [
  DeviceInputMapping(
    inputEvent: 'button_press',
    toolName: 'toggle_listening',
    priority: InputPriority.high,
    isCustomizable: true,
    displayName: 'Main Button',
  ),
  DeviceInputMapping(
    inputEvent: 'double_tap',
    pipelineInput: 'What am I looking at?',
    priority: InputPriority.high,
    isCustomizable: true,
    displayName: 'Double Tap',
  ),
];
```

## PeripheralCapabilities

Declare exactly what your device supports:

| Field | Description |
|-------|-------------|
| `type` | `smartGlasses`, `audioDevice`, `earbuds`, `wristDevice`, `simulated` |
| `hasCamera` | Device has a camera |
| `hasDisplay` | Device has a visual display |
| `hasSpeaker` | Device can play audio |
| `hasMicrophone` | Device can capture audio |
| `hasSensors` | Device has IMU/accelerometer/etc. |
| `hasInput` | Device has touch, buttons, or gesture input |
| `hasWifi` | Device has its own WiFi (rare) |
| `displayWidth/Height` | Display resolution (if applicable) |

## Tool Filtering

When your device connects, `PeripheralCompatibilityChecker` automatically filters the tool registry. Tools requiring capabilities your device does not have will not appear in the LM's tool list.

For example, if `hasCamera: false`, tools with `requiredCapabilities: {PeripheralCapabilityFlag.camera}` are excluded.
