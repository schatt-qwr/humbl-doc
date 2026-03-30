---
sidebar_position: 1
title: IHardwareResourceManager
---

# IHardwareResourceManager

Lease-based hardware resource control. Prevents two tools from fighting over the camera, mic, or other shared hardware.

**File:** `humbl_core/lib/resources/i_hardware_resource_manager.dart`

## Interface

```dart
abstract class IHardwareResourceManager {
  Future<ResourceLease> acquire(
    ResourceType type,
    String resourceId, {
    AccessMode mode = AccessMode.shared,
    Duration timeout = const Duration(seconds: 30),
    required String callerId,
    required AccessLevel callerAccess,
    bool force = false,
  });

  Future<void> release(String leaseId);
  Future<bool> renew(String leaseId, {Duration extension = const Duration(seconds: 30)});
  List<ResourceLease> activeLeasesFor(ResourceType type, {String? resourceId});
  bool isAvailable(ResourceType type, String resourceId, {AccessMode mode = AccessMode.shared});

  ResourceAvailability checkAvailability(
    ResourceType type,
    String resourceId, {
    AccessMode mode = AccessMode.shared,
    required AccessLevel callerAccess,
  });

  Stream<LeaseEvent> get leaseEvents;
  Future<void> revoke(String leaseId, {String reason = 'stale'});
  void dispose();
}
```

## Methods

| Method | Description |
|--------|-------------|
| `acquire()` | Acquire a resource lease. Blocks if exclusive and already held. |
| `release()` | Release a lease. Clears buffer if exclusive. |
| `renew()` | Extend a lease's expiry. Returns false if expired or max exceeded. |
| `activeLeasesFor()` | List active leases on a resource. |
| `isAvailable()` | Quick check if resource can be acquired in given mode. |
| `checkAvailability()` | Detailed availability with compatibility status. |
| `revoke()` | Force-revoke a lease (pipeline kills a stale tool). |

### acquire() Parameters

| Parameter | Description |
|-----------|-------------|
| `type` | Resource type (camera, mic, speaker, etc.) |
| `resourceId` | Specific resource instance (e.g., `camera_rear`) |
| `mode` | `shared` or `exclusive` |
| `timeout` | Lease auto-expires after this duration |
| `callerId` | Identifies who is holding the lease |
| `callerAccess` | Enforced against resource policy (Gate 3) |
| `force` | Revoke conflicting leases before acquiring |

## ConfigCompatibility

Result of `checkAvailability()`:

| Value | Description |
|-------|-------------|
| `available` | Resource is free |
| `sharedCompatible` | Has shared leases, request is also shared |
| `exclusivelyHeld` | Another caller holds exclusive access |
| `sharedConflict` | Caller wants exclusive but shared leases exist |
| `accessDenied` | Caller's access level is insufficient |

## ResourceAvailability

```dart
class ResourceAvailability {
  final ConfigCompatibility compatibility;
  final ResourceType type;
  final String resourceId;
  final AccessMode? activeMode;
  final String? holderId;
  final DateTime? expiresAt;
  final int activeLeaseCount;

  bool get canAcquire;
}
```

## Usage in HumblTool

Gate 3 is enforced automatically by the `@nonVirtual execute()` template:

```dart
// Inside HumblTool.execute() — automatic
for (final resource in requiredResources) {
  final lease = await ctx.resourceManager!.acquire(
    resource,
    resourceIdFor(resource),
    callerId: '${name}_${ctx.traceId}',
    callerAccess: grantedAccess,
    mode: resourceAccessMode,
    timeout: executionTimeout,
    force: forceAcquireResources,
  );
  leases.add(lease);
}
```

All leases are released in a `finally` block after `run()` completes.
