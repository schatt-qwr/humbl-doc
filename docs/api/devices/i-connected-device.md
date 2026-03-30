---
sidebar_position: 2
title: IConnectedDevice
---

# IConnectedDevice

Represents a connected peripheral device with capability interfaces.

**File:** `humbl_core/lib/devices/sdk/i_connected_device.dart`

## Interface

```dart
abstract class IConnectedDevice {
  String get deviceId;
  String get displayName;
  PeripheralCapabilities get capabilities;
  Stream<PeripheralConnectionState> get connectionState;

  // Capability interfaces (non-null only when capability is true)
  ICameraCapability? get camera;
  IDisplayCapability? get display;
  IAudioCapability? get audio;
  ISensorCapability? get sensors;
  IInputCapability? get input;
}
```

## PeripheralConnectionState

```dart
enum PeripheralConnectionState {
  connected,
  disconnecting,
  disconnected,
  reconnecting,
}
```

## Capability Interfaces

### ICameraCapability

```dart
abstract class ICameraCapability {
  Future<List<String>> getAvailableCameras();
  Future<DeviceCaptureResult> takePhoto({
    String? cameraId, String flash = 'off', bool hdr = false, String resolution = 'high',
  });
  Future<String> startVideoRecording({String? cameraId, String quality = '720p'});
  Future<DeviceCaptureResult> stopVideoRecording();
  Stream<Uint8List> get liveFrameStream;
}
```

### IDisplayCapability

```dart
abstract class IDisplayCapability {
  Future<void> showText(String text, {Duration? duration});
  Future<void> showImage(Uint8List pngBytes);
  Future<void> clear();
  Future<void> setBrightness(double value);
}
```

### IAudioCapability

```dart
abstract class IAudioCapability {
  Future<void> playAudio(Uint8List pcmBytes);
  Future<void> speak(String text);
  Stream<Uint8List> get microphoneStream;
  Future<void> setVolume(double value);
}
```

### DeviceCaptureResult

```dart
class DeviceCaptureResult {
  final Uint8List bytes;
  final int width;
  final int height;
  final int fileSizeBytes;
  final String? filePath;
}
```

## Tool Filtering

`PeripheralCompatibilityChecker` filters `ToolRegistry` tools by what the connected device supports. Tools requiring `camera` will not appear if the glasses lack a camera.

```dart
class PeripheralCompatibilityChecker {
  static List<HumblTool> filterByCapabilities(
    List<HumblTool> tools,
    PeripheralCapabilities capabilities,
  );
}
```
