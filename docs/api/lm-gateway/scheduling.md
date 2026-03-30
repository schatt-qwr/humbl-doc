---
sidebar_position: 3
title: Scheduling
---

# LM Scheduling

The LM scheduling layer manages request priority and queuing. Real-time user requests preempt background tasks, and background requests are queued when the model is busy.

## LmScheduler

Wraps `ILmGateway` with priority-based scheduling.

```dart
class LmScheduler {
  LmScheduler({required ILmGateway gateway});

  Future<LmGatewayResponse> submit(LmGatewayRequest request);
  Stream<LmGatewayToken> submitStream(LmGatewayRequest request);

  int get pendingCount;
  int get activeCount;
}
```

### Priority Behavior

| Priority | Behavior |
|----------|----------|
| `realtime` | Executed immediately. Preempts background requests. |
| `background` | Queued if a realtime request is active. Executed in FIFO order. |
| `batch` | Lowest priority. Only runs when no other requests are pending. |

### Preemption

When a `realtime` request arrives while a `background` request is being processed by an on-device model, the scheduler can:

1. Wait for the current background request to complete (if near done).
2. Cancel the background request and start the realtime one.

The preemption strategy depends on the `ILmProvider` capabilities -- cloud providers support concurrent requests natively, while on-device runtimes are single-threaded.

### Queue Management

- Background requests have a max queue depth (configurable, default 10).
- Expired requests (waiting longer than timeout) are dropped with an error.
- Queue state is available via `pendingCount` for diagnostics.

## Integration with HumblAgent

`HumblAgent` assigns priorities based on input source:

| Source | Priority |
|--------|----------|
| User text/voice | `realtime` |
| Scout agent | `background` |
| Scheduled trigger | `background` |
| Event trigger | `background` |

This ensures the user is never blocked by background processing.
