---
sidebar_position: 2
title: ServiceEventBus
---

# ServiceEventBus

Typed pub/sub event bus for decoupled inter-service communication. Services publish events; other services subscribe by type.

**File:** `humbl_core/lib/services/service_event_bus.dart`

## Class Signature

```dart
class ServiceEventBus {
  void publish(ServiceEvent event);
  Stream<T> on<T extends ServiceEvent>();
  Stream<ServiceEvent> get allEvents;
  void dispose();
}
```

## ServiceEvent

```dart
abstract class ServiceEvent {
  final String sourceServiceId;
  final DateTime timestamp;
}
```

## Built-in Events

| Event | Fields | Emitter |
|-------|--------|---------|
| `ServiceStateChangedEvent` | `state` | Any service |
| `DeviceConnectedEvent` | `deviceId`, `deviceName` | BLE/device service |
| `DeviceDisconnectedEvent` | `deviceId`, `reason` | BLE/device service |
| `NetworkStateChangedEvent` | `hasInternet`, `hasLocalNetwork` | Network monitor |
| `ModelLoadedEvent` | `modelId`, `runtimeId` | LM runtime |
| `QuotaWarningEvent` | `level`, `tokensUsed`, `tokensLimit` | Quota manager |

## Usage Example

```dart
final bus = ServiceEventBus();

// Subscribe to specific event type
bus.on<DeviceConnectedEvent>().listen((event) {
  print('Device connected: ${event.deviceName}');
  refreshToolList();
});

// Publish an event
bus.publish(NetworkStateChangedEvent(
  sourceServiceId: 'network_monitor',
  hasInternet: true,
  hasLocalNetwork: true,
));

// Subscribe to all events (for logging)
bus.allEvents.listen((event) {
  logger.event('service_event', traceId, {
    'source': event.sourceServiceId,
    'type': event.runtimeType.toString(),
  });
});
```
