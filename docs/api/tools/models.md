---
sidebar_position: 3
title: Tool Models
---

# Tool Models

Key enums and data classes used throughout the tool system.

**File:** `humbl_core/lib/tools/models.dart`

## Enums

### AccessLevel

Privilege hierarchy (highest to lowest):

| Level | Numeric | Description |
|-------|---------|-------------|
| `system` | 0 | Firmware, emergency, power management |
| `core` | 1 | Built-in pipeline tools |
| `confidential` | 2 | Access to encrypted/private data |
| `trusted` | 3 | Default for built-in tools |
| `standard` | 4 | Third-party tools, MCP bridge tools |
| `restricted` | 5 | Untrusted or sandboxed tools |

### ToolGroup

Capability-based groups. A tool can belong to multiple groups.

```dart
enum ToolGroup {
  // Hardware resources
  mic, camera, speaker, sensor, display, bluetooth, wifi, location, nfc,
  // Functional groups
  capture, media, communication, file, web, shell, contacts,
  // System groups
  system, runtime, memory, pipeline, agent, mcp,
  // AI & automation
  ai, automation,
}
```

### ResourceType

Hardware resources that require leasing:

```dart
enum ResourceType {
  camera, mic, speaker, ble, display, gps, nfc, vibration, sensor,
}
```

### ToolState

Tool readiness state set by `ToolStateManager`:

| State | Description |
|-------|-------------|
| `ready` | Tool can execute |
| `initializing` | Startup in progress |
| `notSupported` | Platform does not support this tool |
| `notAvailable` | Temporarily unavailable (e.g., no network) |
| `permissionNotGranted` | OS permission not granted |
| `error` | Tool errored during initialization |

### ConnectivityRequirement

```dart
enum ConnectivityRequirement {
  offline,       // No network needed
  localNetwork,  // WiFi/LAN/BLE needed
  internet,      // Full internet needed
}
```

### UserTier

```dart
enum UserTier { free, standard, plus, ultimate }
```

### ToolPriority

```dart
enum ToolPriority { p0, p1, p2, p3 }
```

### ToolStatus

```dart
enum ToolStatus { success, error, notSupported, timeout, confirmationRequired }
```

## Data Classes

### ToolResult

```dart
class ToolResult {
  final bool success;
  final ToolStatus status;
  final Map<String, dynamic>? data;
  final String? error;
  final String? displayText;
  final Duration executionTime;
  final Map<String, dynamic>? metadata;
  final String? confirmationMessage;
  final Map<String, dynamic>? confirmationMetadata;

  // Named constructors
  const ToolResult.ok({data, displayText, executionTime, metadata});
  const ToolResult.fail({error, displayText, executionTime, metadata});
  const ToolResult.permissionDenied(String toolName);
  const ToolResult.notSupported(String message);
  ToolResult.confirmationRequired({required String message, Map<String, dynamic>? confirmationData});

  bool get isConfirmationRequired;
  Map<String, dynamic> toJson();
}
```

### ToolContext

Execution context passed to every tool:

```dart
class ToolContext {
  final String userId;
  final UserTier tier;
  final DeviceState device;
  final MemoryContext memory;
  final String runId;
  final String? traceId;
  final CallerType caller;
  final AccessLevel callerAccess;
  final IHardwareResourceManager? resourceManager;
  final ToolRegistry? toolRegistry;
  final ToolPolicy toolPolicy;
  final CancellationToken? cancellationToken;
  final String? parentToolName;
  final bool userConfirmed;

  ToolContext asSubCall(HumblTool parentTool);
  ToolContext copyWith({ ... });
}
```

### ToolStreamEvent

Event emitted by streaming tools:

```dart
class ToolStreamEvent {
  final String toolName;
  final ToolStreamData? data;
  final DateTime timestamp;
  final bool isDone;
  final String? error;
  final bool confirmationRequired;
}
```

### ToolStreamData (sealed)

```dart
sealed class ToolStreamData {}
class AudioStreamData extends ToolStreamData { AudioChunk chunk; }
class VideoStreamData extends ToolStreamData { VideoFrame frame; }
class SensorStreamData extends ToolStreamData { SensorFrame frame; }
class LocationStreamData extends ToolStreamData { LocationFrame frame; }
class DownloadProgressData extends ToolStreamData { int bytesReceived; int? totalBytes; }
```

### VideoFrame

```dart
class VideoFrame {
  final Uint8List bytes;
  final int width;
  final int height;
  final String encoding;  // 'jpeg', 'nv21', 'bgra', 'rgb'
  final double fps;
  final DateTime timestamp;
}
```

### SensorFrame

```dart
class SensorFrame {
  final Map<String, double> values;  // e.g., {'x': 0.1, 'y': 9.8, 'z': 0.0}
  final String sensorType;
  final DateTime timestamp;
}
```

### LocationFrame

```dart
class LocationFrame {
  final double lat;
  final double lng;
  final double? altitude;
  final double? accuracy;
  final double? speed;
  final double? bearing;
  final DateTime timestamp;
}
```

### DeviceState

```dart
class DeviceState {
  final int batteryPercent;
  final bool isCharging;
  final String thermalState;
  final bool hasInternet;
  final bool hasLocalNetwork;
  final bool hasGlassesConnected;
  final int ramAvailableMb;

  bool get hasNetwork;
  bool meetsConnectivity(ConnectivityRequirement requirement);
}
```

### MemoryContext

```dart
class MemoryContext {
  final List<Map<String, dynamic>> relevantMemories;
  final Map<String, dynamic>? activeConversation;
}
```
