---
sidebar_position: 3
title: Scheduling
---

# LM Scheduling

Serializes access to a local `BaseChatModel` with realtime / background / cloud priority. Rewritten 2026-04-21 (B3) on top of `BaseChatModel` after the SP7.5 `ILmGateway` collapse — lives in `humbl_lm`, not `humbl_core`.

**Package:** `humbl_lm`
**File:** `humbl_lm/lib/scheduling/lm_scheduler.dart`

## LmScheduler

```dart
class LmScheduler {
  LmScheduler({
    required BaseChatModel localModel,
    BaseChatModel? cloudModel,
  });

  Future<AIMessage> invoke(
    List<BaseMessage> messages, {
    LmPriority priority = LmPriority.realtime,
    RunnableConfig? config,
  });

  Stream<AIMessageChunk> stream(
    List<BaseMessage> messages, {
    LmPriority priority = LmPriority.realtime,
    RunnableConfig? config,
  });
}
```

Both `invoke` and `stream` accept the same `LmPriority` enum and pass through to the underlying model. Streaming calls hold the scheduler's slot for the full stream duration (not just until the first chunk).

## LmPriority

```dart
enum LmPriority {
  realtime,    // User-facing. Jumps ahead of waiting backgrounds.
  background,  // Queues behind realtime; one at a time.
  cloud,       // Bypasses scheduler entirely — parallel.
}
```

| Priority | Behavior |
|----------|----------|
| `realtime` | Serialized via the chain; counts as "realtime in-flight" so new backgrounds can't start until it drains. |
| `background` | Waits for `realtimeInFlight == 0` before chaining onto the local model's queue. Multiple backgrounds run one at a time. |
| `cloud` | Delegates directly to `cloudModel` (or `localModel` as fallback) with no scheduler coordination. Safe because cloud calls don't compete for on-device resources. |

## Honest limits on "preemption"

`BaseChatModel.invoke` and `BaseChatModel.stream` are **non-cancellable** `Future`s / `Stream`s. That means a background that has already started executing against the local model **finishes** before a newly-arrived realtime runs — the scheduler cannot interrupt mid-inference.

What the scheduler actually guarantees:
- New backgrounds cannot **start** while any realtime is pending or running.
- The next slot on the local model always goes to the oldest pending realtime, then the oldest pending background, in FIFO order within each priority level.

This is "head-of-queue priority", not "pre-emption." The docs call it out so callers don't expect in-flight cancellation.

## Cloud fallback

`LmScheduler(localModel: ..., cloudModel: null)` is valid. When `priority: LmPriority.cloud` is requested without a `cloudModel`, the call falls back to `localModel` — useful for environments where the "cloud" path isn't wired yet or the local model is multi-purpose.

## Error handling

Errors thrown by `localModel.invoke` propagate to the caller of `scheduler.invoke`. The chain survives — subsequent calls queue and execute normally. No special retry logic in the scheduler itself (retry is the caller's responsibility — `ResilientExecutor` in `humbl_core/lib/resilience/` is the usual wrapper).

## Wiring with HumblChatModel

Typical wiring in `humbl_app/lib/main.dart`:

```dart
final humblChatModel = HumblChatModel(router: router, quotaManager: quota);

final scheduler = LmScheduler(
  localModel: humblChatModel,
  // cloudModel omitted — HumblChatModel already routes cloud vs on-device
  // via Router strategies; scheduler only needs serialization for local work.
);

final realtime = await scheduler.invoke(
  [HumanMessage(content: userText)],
  priority: LmPriority.realtime,
);

// Scout/background agent:
final background = await scheduler.invoke(
  [HumanMessage(content: digestPrompt)],
  priority: LmPriority.background,
);
```

## Tests

`humbl_lm/test/lm_scheduler_test.dart` covers:
- Cloud priority bypasses local queue (parallel with realtime).
- Realtime jumps ahead of a waiting background.
- Multiple backgrounds serialize one at a time.
- Cloud falls back to local when no `cloudModel` supplied.
- Errors propagate without wedging the chain.

## Integration with HumblAgent

`HumblAgent` assigns priorities based on input source:

| Source | Priority |
|--------|----------|
| User text / voice turn | `realtime` |
| Scout agent | `background` |
| Scheduled trigger | `background` |
| Cloud-bound request | `cloud` |

This keeps user-facing responsiveness ahead of background processing without hanging new scouts on an already-running one.
