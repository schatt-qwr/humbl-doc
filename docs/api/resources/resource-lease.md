---
sidebar_position: 2
title: ResourceLease
---

# ResourceLease

Immutable lease on a hardware resource. Renewals produce a new instance rather than mutating in place.

**File:** `humbl_core/lib/resources/resource_lease.dart`

## Class

```dart
class ResourceLease {
  final String leaseId;
  final ResourceType type;
  final String resourceId;
  final AccessMode mode;
  final DateTime acquiredAt;
  final DateTime expiresAt;
  final String callerId;
  final int renewCount;
  final Stream<dynamic>? streamBuffer;

  ResourceLease renewed(DateTime newExpiry);
  ResourceLease snapshot();
}
```

| Field | Description |
|-------|-------------|
| `leaseId` | Unique identifier for this lease |
| `type` | Resource type (camera, mic, etc.) |
| `resourceId` | Specific resource instance |
| `mode` | `shared` or `exclusive` |
| `acquiredAt` | When the lease was granted |
| `expiresAt` | When the lease auto-expires |
| `callerId` | Who holds the lease |
| `renewCount` | How many times the lease has been renewed |
| `streamBuffer` | Live stream from the resource (shared across all holders) |

## AccessMode

```dart
enum AccessMode {
  shared,     // Multiple callers can read simultaneously
  exclusive,  // Only one caller can access
}
```

All buffers are in protected memory regardless of mode.

## LeaseEvent

```dart
class LeaseEvent {
  final LeaseEventType type;
  final ResourceLease lease;
  final String? reason;
  final DateTime timestamp;
}

enum LeaseEventType { acquired, renewed, expired, released, revoked }
```

## Exceptions

### ResourceBusyException

Thrown when a resource is held exclusively and cannot be acquired:

```dart
class ResourceBusyException implements Exception {
  final String message;
}
```

### ResourceAccessDeniedException

Thrown when the caller's access level is insufficient:

```dart
class ResourceAccessDeniedException implements Exception {
  final String message;
}
```

## Stream Buffer Sharing

When a resource supports streaming (camera, mic, sensors), all shared lease holders receive the **same** stream instance. The resource manager starts the platform stream once and broadcasts to all consumers.

This means:
- First shared lease acquirer triggers the platform to start streaming.
- Subsequent shared acquirers receive the same broadcast stream.
- When the last shared lease is released, the platform stream is stopped.
- Exclusive leases get sole access to the stream.
