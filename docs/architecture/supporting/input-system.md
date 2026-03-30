---
sidebar_position: 2
title: Input System
---

# Input System

The input system provides a unified pipeline entry point for all input modalities: text, voice, video, gestures, sensors, MCP push events, scheduled triggers, and agent handoffs. All sources are normalized into a single stream that the pipeline consumes.

All classes live in `humbl_core/lib/input/`.

## What

The input system is a three-layer fan-in architecture:

1. **`IInputSource`** -- individual input adapters (one per modality).
2. **`InputSourceRegistry`** -- collects all sources, merges their event streams.
3. **`InputArbitrator`** -- the brain. Classifies events (input vs. interrupt), deduplicates, priority-queues, and emits two output streams: `PipelineInput` for new work, `PipelineInterrupt` for cancellation/interruption signals.

`HumblAgent` subscribes to both output streams. Each `PipelineInput` spawns a pipeline run. Each `PipelineInterrupt` cancels or modifies active runs.

## Why InputArbitrator?

A voice-native AI application has many simultaneous input sources:

- **Voice** from the microphone (always-on when the session is active).
- **Text** from the companion app chat.
- **Gestures** from glasses touch/swipe/button events via BLE.
- **Sensors** reporting environmental changes (noise level, motion).
- **Scheduled triggers** (check weather at 7am, reminder at 3pm).
- **MCP push events** from external tool servers.
- **Agent handoffs** from background agents completing tasks.
- **Notification taps** from OS notifications.

Without a central arbitrator, each source would need its own path to the pipeline, creating multiple entry points with no coordination. This leads to:

- **Duplicate processing.** A user says "stop" via voice while also tapping the cancel button -- two cancel events hit the pipeline.
- **Priority inversion.** A background sensor event could queue ahead of an urgent voice command.
- **No interruption path.** There is no way to cancel a running pipeline from any input source.
- **Starvation.** High-frequency sensor events could flood the queue, starving voice and text inputs.

The `InputArbitrator` solves all of these by providing:

- **Single fan-in point.** All input flows through one arbitrator. No alternative paths.
- **Priority ordering.** Critical > high > normal > background. Within the same priority, modality ordering (voice > gesture > text > sensor > schedule) breaks ties. Higher-priority inputs jump ahead in the queue.
- **Cancel keyword detection.** The arbitrator detects cancel keywords ("stop", "cancel", "ruk", "band karo", "bas") and immediately emits a `UserCancel` interrupt -- no LM call, no pipeline run, instant interruption. This is critical for voice interaction where the user needs to stop the assistant mid-response.
- **Deduplication.** Same intent within a 2-second threshold is dropped, preventing accidental double-triggers from echo events, double-taps, or voice + text saying the same thing simultaneously.

## How It Connects

```
IInputSource (voice)  ──┐
IInputSource (text)   ──┤
IInputSource (sensor) ──┼──► InputSourceRegistry ──► InputArbitrator
IInputSource (mcp)    ──┤         (merged stream)       ├── PipelineInput stream → HumblAgent
IInputSource (gesture)──┘                                └── PipelineInterrupt stream → HumblAgent
```

The architecture flows from left to right:

1. Each `IInputSource` emits `RawInput` events on its `events` stream.
2. `InputSourceRegistry` merges all source streams into a single `mergedEvents` stream using `StreamGroup`.
3. `InputArbitrator` subscribes to `mergedEvents`, classifies each event, and emits on one of two output streams.
4. `HumblAgent` subscribes to both output streams. Inputs spawn pipeline runs. Interrupts cancel active runs.

## IInputSource

Every input modality implements this interface. Sources can be one-shot (text typed, notification tap) or latched (voice stream, sensor events). A latched source stays active and continuously emits events until deactivated.

```dart
abstract class IInputSource {
  String get id;
  InputSourceType get type;
  bool get isLatched;
  bool get isActive;
  Stream<RawInput> get events;
  Future<void> activate();
  Future<void> deactivate();
}
```

- **`id`** -- unique identifier for this source instance (e.g., `'voice_primary'`, `'ble_glasses_1'`).
- **`type`** -- the modality category (see below).
- **`isLatched`** -- if `true`, the source emits continuous events (voice frames, sensor readings). If `false`, the source emits discrete events (text submission, button press).
- **`isActive`** -- whether the source is currently producing events.
- **`activate()`/`deactivate()`** -- start/stop event production. For voice, this starts/stops the microphone. For sensors, this starts/stops the sensor subscription.

### InputSourceType

| Type | Description | Typical Source | Latched? |
|------|-------------|----------------|----------|
| `text` | Typed text from companion app chat | UI text field | No |
| `voice` | Voice via VAD to STT stream | Microphone + VAD + STT | Yes (while speaking) |
| `videoFrame` | Video frame from camera stream | Camera | Yes (while recording) |
| `sensor` | Sensor data from ISensorManager streams | Accelerometer, gyroscope, ambient light | Yes |
| `mcpPush` | MCP server push event | External MCP tool server | No |
| `toolOutput` | Tool emitting async result or stream | Running tool | No |
| `schedule` | EventTrigger timer/cron firing | EventTriggerManager | No |
| `agentHandoff` | Background agent returning a result | Background agent completing its task | No |
| `notification` | OS notification tap | OS notification system | No |
| `gestureGlasses` | Glasses touch/swipe/button gesture | BLE-connected glasses | No |

### RawInput

A raw input event from any source before classification. This is the universal envelope -- every input modality is normalized into this structure before reaching the arbitrator.

```dart
class RawInput {
  final String sourceId;
  final InputSourceType sourceType;
  final dynamic content;        // Raw payload (audio bytes, sensor reading, JSON, etc.)
  final String? text;           // Text representation (if available)
  final InputPriority priority;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;  // Source-specific data (BLE device ID, MCP server ID, etc.)
}
```

For voice inputs, `content` is the transcribed text (STT has already run) and `text` is the same string. For sensor inputs, `content` is the sensor reading object and `text` is a natural-language description (e.g., "ambient noise level exceeded 80dB"). For gesture inputs, `content` is the gesture type and `text` is the mapped action text (from `DeviceInputMapping`).

### InputPriority

| Priority | Use Case | Queue Behavior |
|----------|----------|---------------|
| `background` | Sensor events, scheduled triggers, agent handoffs | Processed last. May be dropped if queue is full. |
| `normal` | Text input, voice commands, gestures | Standard FIFO within this priority band. |
| `high` | User-initiated actions that should preempt background | Jumps ahead of normal and background. |
| `critical` | Emergency, cancel commands, safety-critical sensor events | Processed first. May trigger interrupts instead of inputs. |

## InputSourceRegistry

Tracks all registered input sources and provides a merged event stream. Sources can be registered and unregistered dynamically -- this is important because some sources only exist while a device is connected (glasses gesture source) or while a tool is running (spawned listener source).

```dart
class InputSourceRegistry {
  Stream<RawInput> get mergedEvents;
  Stream<InputSourceChange> get changes;

  void register(IInputSource source);
  Future<void> unregister(String sourceId);
  Future<void> activate(String sourceId);
  Future<void> deactivate(String sourceId);

  List<IInputSource> get all;
  List<IInputSource> get active;
  IInputSource? get(String id);

  Future<void> dispose();
}
```

### Dynamic Registration

Sources can be registered at any time during the app lifecycle:

- **At startup:** Text input, voice input, schedule triggers are registered.
- **On device connection:** Glasses gesture source is registered when BLE connects, unregistered on disconnect.
- **On MCP install:** MCP push source is registered when an MCP server is installed.
- **On tool spawn:** When an LM tool calls `spawn_listener`, a new `IInputSource` is registered at runtime that listens for a specific condition and emits an event when it triggers.

The `changes` stream emits `InputSourceChange` events (registered, unregistered, activated, deactivated) so the debug dashboard can display the current input source state.

## InputArbitrator

The core fan-in component. Consumes all events from `InputSourceRegistry.mergedEvents` and produces two output streams.

```dart
class InputArbitrator {
  InputArbitrator({required InputSourceRegistry registry});

  Stream<PipelineInput> get inputs;
  Stream<PipelineInterrupt> get interrupts;

  void start();
  void stop();
  Future<void> dispose();
}
```

### Classification (Lightweight, No LM Call)

Each incoming `RawInput` is classified without any LM invocation. This classification is pure string matching and priority checking -- it adds microseconds of latency, not hundreds of milliseconds:

- **Cancel keywords** become `UserCancel` interrupts. Supported keywords: `stop`, `cancel`, `never mind`, `nevermind`, `quit`, `abort`, `ruk`, `band karo`, `bas` (Hindi). These are matched case-insensitively against the `text` field. When matched, the arbitrator immediately emits a `UserCancel` interrupt -- no pipeline run is created, and `HumblAgent` cancels all foreground runs.

- **Critical priority events** from any source become `ExternalEvent(critical)` interrupts. These include emergency sensor readings (fall detection, SOS button) and system-level alerts (battery critical, thermal throttle). `HumblAgent` cancels ALL runs (including scouts) on critical interrupts.

- **Everything else** becomes a `PipelineInput`, enqueued by priority.

### Why No LM for Classification?

The arbitrator's job is to route inputs to the pipeline -- the pipeline's `ClassifyNode` handles LM-based intent classification. The arbitrator only needs to answer two questions: "Is this a cancel?" and "What priority does this have?" Both questions can be answered with simple string matching and priority checking. Using an LM here would add ~400ms latency before the user's cancel command takes effect -- unacceptable for voice interaction where "stop" needs to be instant.

### Priority Queue

Inputs are enqueued by priority (critical first, then by timestamp within the same priority band). Higher-priority inputs jump ahead in the queue.

Priority order: `critical > high > normal > background`

Modality priority for tie-breaking (same priority, same timestamp): `voice > gesture > text > sensor > schedule`. Voice takes priority because it is the primary interaction mode for smart glasses. Gesture takes second priority because it requires physical action (intentional). Text is third because it is typed (slower, less urgent). Sensor and schedule are last because they are automated.

### Deduplication

Same intent within a 2-second window is dropped. The dedup key is `sourceType:text|content`, preventing:

- **Double-taps:** User taps a glasses button twice quickly. The second tap within 2s is dropped.
- **Echo events:** Voice STT produces "turn on WiFi" while the user also types "turn on WiFi" (e.g., testing). The second input within 2s is dropped.
- **BLE retransmits:** A flaky BLE connection may deliver the same gesture event twice. The second within 2s is dropped.

The 2-second threshold is intentionally short. Longer windows would prevent legitimate rapid interactions (asking two different questions within 3 seconds). Shorter windows would miss some duplicates. 2 seconds was chosen based on typical voice-to-text + typing overlap scenarios.

### PipelineInput

The typed input that `HumblAgent` feeds into the pipeline. All modality-specific details have been normalized -- the pipeline sees a uniform input regardless of whether it came from voice, text, gesture, or any other source.

```dart
class PipelineInput {
  final String text;
  final InputModality modality;
  final String sourceId;
  final InputSourceType sourceType;
  final InputPriority priority;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;
}
```

The `metadata` field carries source-specific context that downstream nodes may need:
- For voice: `confidence` (STT confidence score), `audioDurationMs`.
- For gesture: `gestureType`, `deviceId`, pre-mapped `toolName` (for Tier 0 pass-through).
- For schedule: `triggerId`, `cronExpression`.
- For MCP push: `serverId`, `eventType`.

### PipelineInterrupt

Sealed class hierarchy for interrupt signals. Each type maps to a specific `HumblAgent` action:

```dart
sealed class PipelineInterrupt {}

class UserCancel extends PipelineInterrupt {}
// Action: Cancel foreground runs only. Scouts keep running.

class ExternalEvent extends PipelineInterrupt {
  final String event;
  final InterruptPriority priority;
}
// Action: If critical, cancel ALL runs. Otherwise log only.

class NodeTimeout extends PipelineInterrupt {
  final String nodeName;
  final Duration elapsed;
}
// Action: Cancel the timed-out run. Log warning.

class SystemAlert extends PipelineInterrupt {
  final String alert;
  final InterruptAction action; // pause, cancel, notify
}
// Action: Depends on InterruptAction. Pause pauses all runs.
// Cancel cancels all runs. Notify just emits to UI.
```

## Source Files

| File | Description |
|------|-------------|
| `humbl_core/lib/input/i_input_source.dart` | IInputSource, InputSourceType, RawInput, InputPriority |
| `humbl_core/lib/input/input_source_registry.dart` | InputSourceRegistry, InputSourceChange |
| `humbl_core/lib/input/input_arbitrator.dart` | InputArbitrator, PipelineInput |
| `humbl_core/lib/pipeline/models/pipeline_interrupt.dart` | PipelineInterrupt hierarchy |
