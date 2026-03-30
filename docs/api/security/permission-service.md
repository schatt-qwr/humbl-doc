---
sidebar_position: 2
title: PermissionService
---

# PermissionService & ToolStateManager

OS-level permission probing and tool state management.

## IPermissionService

```dart
abstract class IPermissionService {
  Future<bool> isGranted(String permission);
  Future<bool> request(String permission);
  Future<Map<String, bool>> checkAll(List<String> permissions);
}
```

### Implementations

| Class | Platform |
|-------|----------|
| `MobilePermissionService` | Android, iOS (wraps `permission_handler`) |
| `DesktopPermissionService` | Windows, macOS, Linux (always returns true for most permissions) |

## ToolStateManager

Probes OS permissions at startup and sets each tool's `ToolState`.

```dart
class ToolStateManager {
  ToolStateManager(ToolRegistry registry, IPermissionService permissionService);

  Future<void> probeAll();
  Future<void> probe(String toolName);
  ToolState getState(String toolName);
}
```

### Probe Logic

For each tool in the registry:

1. Check if the tool's `requiredResources` map to OS permissions.
2. Call `permissionService.isGranted()` for each required permission.
3. Set tool state based on results:

| Condition | Resulting State |
|-----------|----------------|
| All permissions granted | `ToolState.ready` |
| Platform not supported | `ToolState.notSupported` |
| Permission not granted | `ToolState.permissionNotGranted` |
| Error during probe | `ToolState.error` |

## ToolState Enum

```dart
enum ToolState {
  ready,                  // Can execute
  initializing,           // Startup in progress
  notSupported,           // Platform doesn't support this
  notAvailable,           // Temporarily unavailable
  permissionNotGranted,   // OS permission needed
  error,                  // Initialization failed
}
```

## Permission Tool

A meta-tool (`register_permission_tool`) that the LM can invoke to request OS permissions on behalf of the user. Registered after `ToolStateManager` initialization:

```dart
registerPermissionTool(ToolRegistry registry, ToolStateManager stateManager);
```

When invoked, it calls `permissionService.request()` and re-probes the requesting tool's state.
