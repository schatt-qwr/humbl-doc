---
sidebar_position: 7
title: Services & Agent
---

# Services & Agent

The services layer provides the top-level orchestration for Humbl: the always-free `HumblAgent` dispatcher, automatic session management, and a typed event bus for inter-service communication.

## What

`HumblAgent` is the single entry point for all user and system interactions. It replaces direct `PipelineOrchestrator` usage with a non-blocking dispatcher that manages concurrent pipeline runs, scout agents, sessions, and device input mappings. `SessionManager` handles automatic session creation and lifecycle. `ServiceEventBus` provides typed, decoupled inter-service communication.

## Why HumblAgent?

Without `HumblAgent`, every part of the app that wants to trigger a pipeline run would need to:

1. Get or create a session manually.
2. Build a `PipelineState` with the correct user context, device state, and available tools.
3. Call `orchestrator.runStream()` directly.
4. Track the run for cancellation on interrupt.
5. Handle concurrent runs (voice command while a background check is running).

This logic would be duplicated across the UI layer, the input system, the event trigger system, and the scout system. `HumblAgent` centralizes all of this into a single dispatcher that:

- **Never blocks.** All pipeline runs are spawned as concurrent streams. The agent dispatches and monitors -- it never awaits a run to completion before accepting the next input.
- **Manages concurrency.** Multiple pipeline runs can execute simultaneously (a user query, a background weather check, a scheduled reminder). The agent tracks all active runs, applies priority scheduling for LM access, and handles cancellation.
- **Provides a single results stream.** All pipeline outputs -- user-initiated and scout -- emit on `results`, giving the UI layer one stream to subscribe to.
- **Maps to LangGraph's AgentExecutor pattern.** For developers familiar with LangGraph, `HumblAgent` is the equivalent of `AgentExecutor` -- it manages the agent loop, tool execution cycle, and multi-step reasoning.

```dart
class HumblAgent {
  HumblAgent({
    required PipelineOrchestrator orchestrator,
    required InputArbitrator arbitrator,
    required SessionManager sessionManager,
    DeviceState? initialDeviceState,
  });

  Stream<AgentResult> get results;
  int get activeRunCount;

  void setUser(String userId, UserTier tier);
  void updateDeviceState(DeviceState state);
  void start();
  Future<void> stop();

  Stream<PipelineState> spawnScout({
    required String taskId,
    required String toolName,
    Map<String, dynamic> toolParams = const {},
    InputPriority priority = InputPriority.background,
    String? parentRunId,
  });

  Future<void> dispose();
}
```

## How It Connects

```
InputArbitrator ──► HumblAgent (dispatcher, never blocks)
                      ├── Pipeline Run 1 (user query)
                      ├── Pipeline Run 2 (button press → scout)
                      ├── Pipeline Run 3 (timer trigger → scout)
                      └── All concurrent, priority-scheduled for LM
                               │
                               ▼
                         AgentResult stream → UI / OutputManager
```

The `InputArbitrator` feeds prioritized `PipelineInput` events to the agent. The agent subscribes to the arbitrator's `inputs` stream and `interrupts` stream. For each input, it builds the pipeline state and spawns a run. For each interrupt, it cancels the appropriate runs (see interrupt handling below). Pipeline outputs flow to the `results` stream, which the UI layer (or `OutputManager`) consumes to display responses.

### Input Handling (Step by Step)

When a `PipelineInput` arrives from the `InputArbitrator`:

1. **Session resolution.** Call `sessionManager.getOrCreateSession(userId, deviceId)`. If the last activity was more than 30 minutes ago, a new session is created. Otherwise the existing session is resumed and its `lastActivityAt` updated.

2. **State construction.** Build a `PipelineState` with:
   - `inputText` from the `PipelineInput`
   - `inputModality` (text, voice, gesture, etc.)
   - `sessionId` from the resolved session
   - `userId` and `tier` from `setUser()`
   - `deviceState` from `updateDeviceState()`
   - `availableTools` filtered by current connectivity and device capabilities

3. **Tier 0 detection.** If the input has pre-set `toolName` metadata (from a device button mapping or a scout spawn), set `activeToolName` and `intentStatus: complete` on the pipeline state. This causes `ClassifyNode` to skip the LM call entirely -- the tool is already known, so classification would waste latency and tokens.

4. **Pipeline spawn.** Call `orchestrator.runStream(state)` to start a streaming pipeline run. Each intermediate state is available for UI progress indicators (e.g., "Classifying..." -> "Executing wifi_toggle..." -> "Done").

5. **Run tracking.** The run is added to the active runs map, keyed by `runId`. This enables cancellation by `runId` and monitoring of `activeRunCount`.

### Interrupt Handling

| Interrupt | Action |
|-----------|--------|
| `UserCancel` | Cancel foreground runs only (scouts keep running). The user said "stop" or "cancel" -- they want to abort their current query, not background tasks. |
| `ExternalEvent(critical)` | Cancel ALL runs -- foreground and scout. Critical events (low battery, emergency) take absolute priority. |
| Other | Log the interrupt but do not cancel. Non-critical external events (network change, device disconnect) are informational. |

Cancellation works by completing the pipeline run's `StreamSubscription` and marking the run as cancelled in the tracking map. The pipeline's `StateGraph` checks for cancellation between nodes -- a cancelled run stops after the current node completes (it does not abort mid-node).

## Scout Agents

### What

Scouts are pre-configured pipeline runs where the parent (HumblAgent or a user action) specifies the exact tool and parameters. They bypass classification entirely, executing a known tool at the lowest priority.

### Why

Many assistant tasks do not need LM classification:

- **Background monitoring.** Check weather every hour, check calendar for upcoming meetings, monitor battery level. These are known tools with known parameters -- spending ~400ms on SLM classification per check is wasteful.
- **Scheduled tasks.** EventTriggerManager fires a cron-like timer and needs to invoke `reminder_check` with specific params. No ambiguity, no classification needed.
- **Device button actions.** The user presses a button on their glasses mapped to `take_photo`. The device provider declares this mapping at connection time. Again, no classification.

### How Scouts Work

```dart
final stream = agent.spawnScout(
  taskId: 'weather_check',
  toolName: 'weather_check',
  toolParams: {'location': 'current'},
  priority: InputPriority.background,
);
```

Scouts flow through the pipeline with `activeToolName` and `intentStatus: complete` pre-set. This causes:

1. **`ContextAssemblyNode`** -- runs normally (loads context, filters tools). Lightweight since scouts typically don't need full conversation history.
2. **`ClassifyNode`** -- **Tier 0 pass-through.** Sees `intentStatus: complete` and `activeToolName` already set, so it skips the LM call entirely. Zero LM cost, zero latency.
3. **`RouteDecisionNode`** -- routes to `ExecutionPath.fast` (the tool is local and known).
4. **`ExecuteToolNode`** -- executes the tool through the normal five-gate security model.
5. **`DeliverNode`** -- formats the result. For scouts, delivery may be silent (background data update) or may surface a notification (reminder alert).
6. **`LoopCheckNode`** -- typically one step, no loop.

### Scout vs. Direct Tool Call

Why not just call `toolRegistry.execute()` directly? Because scouts still benefit from the pipeline infrastructure:

- **Gate enforcement.** All five security gates are checked. A background scout cannot invoke a system-level tool.
- **Logging.** The journal captures the full trace: tool execution time, gate results, resource leases.
- **Memory.** DeliverNode writes to the interaction log (T4), so the memory consolidator can learn from scout results.
- **Interruption.** Critical interrupts can cancel scouts via the standard mechanism.

### AgentResult

```dart
class AgentResult {
  final String runId;
  final PipelineState state;
  final bool isScout;

  String? get outputText;
  String? get toolName;
  bool get hasError;
}
```

The `isScout` flag lets the UI layer decide how to present the result. Scout results might be displayed as a subtle notification or badge rather than a full chat response.

### DeviceInputMapping

Device providers declare input mappings at connection time. These map hardware events (button press, gesture) to either direct tool invocation (Tier 0) or pipeline text input (needs classification).

```dart
class DeviceInputMapping {
  final String inputEvent;      // e.g., 'single_tap', 'button_1_press'
  final String? toolName;       // Direct tool mapping (Tier 0, skips classification)
  final Map<String, dynamic>? toolParams;
  final String? pipelineInput;  // Text for LM classification
  final InputPriority priority;
  final bool isCustomizable;    // User can remap in settings
  final String displayName;     // "Take Photo", "Toggle Flashlight"
}
```

When a glasses button event arrives via BLE, the `InputArbitrator` checks the device's input mappings. If the mapping has a `toolName`, it creates a `PipelineInput` with pre-set tool metadata (Tier 0). If it has `pipelineInput` text, it creates a standard input that flows through classification.

## AgentSession & SessionManager

### Why Sessions?

One user = one persistent AI agent. But a continuous, never-ending conversation is unusable -- context grows unbounded, old topics pollute new queries, and there is no natural boundary for "what happened today." Sessions provide that boundary.

### AgentSession

```dart
class AgentSession {
  final String sessionId;
  final String userId;
  final String deviceId;
  final DateTime createdAt;
  SessionState state;
  DateTime lastActivityAt;
  int turnCount;
}

enum SessionState { active, paused, handedOff, archived }
```

- **`active`** -- the session is in use on this device.
- **`paused`** -- the user has backgrounded the app or the idle gap hasn't yet triggered a new session.
- **`handedOff`** -- the session was handed off to another device (only one device is active at a time, like Apple Handoff).
- **`archived`** -- the session was ended (by idle gap, manual clear, or day boundary). Archived sessions are read-only and feed the conversation store.

### SessionManager

```dart
class SessionManager {
  AgentSession? get current;
  Stream<AgentSession> get sessionChanges;

  AgentSession getOrCreateSession({
    required String userId,
    required String deviceId,
  });

  void recordTurn();
}
```

### Auto-Session Logic

The session manager applies three rules:

1. **30-minute idle gap.** If `lastActivityAt` was more than 30 minutes ago, the current session is archived and a new one is created. This prevents stale context from accumulating during long breaks (lunch, meetings, sleep).

2. **One session per day per device (UTC).** Even if the user is continuously active across midnight UTC, the session manager creates a new session. This provides a natural daily boundary for the conversation store and enables "daily summary" features.

3. **Manual clear.** The user can explicitly end a session via the UI. The current session is archived immediately and a new one starts. This is useful when the user wants to change topics completely ("forget what we were talking about").

Archived sessions are not deleted -- they persist in `ConversationStore` and feed training data selection. The conversation history from archived sessions is available for memory consolidation (T4 -> T2/T3 promotion) but is not loaded into the active context window.

## ServiceEventBus

### What

A typed pub/sub event bus for decoupled inter-service communication.

### Why

Services in Humbl need to react to each other's state changes, but direct service-to-service calls create tight coupling and circular dependencies. For example:

- When BLE disconnects, the pipeline needs to update available tools (remove BLE-dependent tools).
- When the network changes, the LM gateway needs to re-evaluate routing (switch from cloud to local).
- When quota reaches 80%, the UI needs to show a warning badge.

Without an event bus, each service would need a reference to every other service it communicates with. The event bus inverts this: services publish events to a central bus, and interested parties subscribe by type. No service knows who is listening.

### How It Works

```dart
class ServiceEventBus {
  void publish(ServiceEvent event);
  Stream<T> on<T extends ServiceEvent>();
  Stream<ServiceEvent> get allEvents;
  void dispose();
}
```

The bus uses Dart's `StreamController.broadcast()` internally. `on<T>()` returns a filtered stream that only emits events of type `T` (using `whereType<T>()`). This is type-safe at compile time -- subscribing to `on<DeviceConnectedEvent>()` will never receive a `QuotaWarningEvent`.

### ServiceEvent Base Class

```dart
abstract class ServiceEvent {
  final String sourceServiceId;
  final DateTime timestamp;
}
```

Every event carries the source service ID (for debugging/logging) and a timestamp. Subclasses add domain-specific fields.

### Built-in Event Types

| Event | Fields | Emitted By | Typical Subscribers |
|-------|--------|-----------|---------------------|
| `ServiceStateChangedEvent` | `state` | Any service | Service health dashboard |
| `DeviceConnectedEvent` | `deviceId`, `deviceName` | BLE service | HumblAgent (update device state, register input mappings) |
| `DeviceDisconnectedEvent` | `deviceId`, `reason` | BLE service | HumblAgent (clear device state), ToolRegistry (update tool availability) |
| `NetworkStateChangedEvent` | `hasInternet`, `hasLocalNetwork` | Network monitor | LM gateway (re-route), tool availability filter |
| `ModelLoadedEvent` | `modelId`, `runtimeId` | LM runtime | Pipeline (update available models) |
| `QuotaWarningEvent` | `level`, `tokensUsed`, `tokensLimit` | Quota manager | UI (show warning badge) |

### Usage Example

```dart
// BLE service publishes when glasses connect
eventBus.publish(DeviceConnectedEvent(
  sourceServiceId: 'ble',
  deviceId: 'glasses-1',
  deviceName: 'Humbl Glasses',
));

// HumblAgent subscribes to update device state and input mappings
eventBus.on<DeviceConnectedEvent>().listen((e) {
  agent.updateDeviceState(DeviceState(
    connectedDeviceId: e.deviceId,
    connectedDeviceName: e.deviceName,
  ));
});

// ToolRegistry subscribes to update tool availability
eventBus.on<NetworkStateChangedEvent>().listen((e) {
  toolRegistry.updateConnectivity(
    hasInternet: e.hasInternet,
    hasLocalNetwork: e.hasLocalNetwork,
  );
});
```

### Event Bus vs. Direct Streams

Some services already expose their own `Stream<T>` (e.g., `INetworkMonitor.status`). The event bus does not replace these -- it complements them. Module-internal streams carry detailed, high-frequency data (every network status change, every BLE RSSI update). The event bus carries significant state changes that cross module boundaries. A service listens to its own detailed stream and publishes summary events to the bus when something meaningful changes.

## Background Agents (IBackgroundAgent)

Background agents are autonomous, scheduled task executors that run outside of user-initiated pipeline turns. They use the same pipeline infrastructure (gate enforcement, logging, memory) but operate on their own schedule.

### IBackgroundAgent Interface

```dart
abstract class IBackgroundAgent {
  String get agentId;
  String get displayName;
  AgentCategory get category;      // productivity, health, communication, system, lifestyle
  Duration get defaultInterval;    // How often to run
  bool get requiresCloud;          // Free (on-device) or credit-gated (cloud)
  int get estimatedTokens;         // For credit pre-check

  Future<AgentRunResult> execute(AgentContext context);
  bool shouldRun(AgentContext context);  // Pre-checks: time of day, battery, connectivity
}
```

### AgentContext

Every background agent receives the full Humbl ecosystem:

```dart
class AgentContext {
  final String userId;
  final UserTier tier;           // free: 0 slots, standard: 2, plus: 5, ultimate: 10
  final DeviceState device;
  final IMemoryService memory;
  final ToolRegistry tools;
  final ILmGateway gateway;     // Can use on-device or cloud LM
  final ISystemJournal journal;
  final DateTime now;
}
```

### 10 Built-in Background Agents

| Agent | Category | Cloud? | Purpose |
|-------|----------|--------|---------|
| `MorningBriefingAgent` | productivity | Yes | Daily summary of calendar, weather, news |
| `SmartCommuteAgent` | lifestyle | Yes | Route and transit updates for daily commute |
| `HealthMonitorAgent` | health | No | Track health metrics from connected sensors |
| `BatteryOptimizerAgent` | system | No | Optimize power usage based on usage patterns |
| `NotificationDigestAgent` | communication | No | Summarize and prioritize notifications |
| `MeetingPrepAgent` | productivity | Yes | Pre-fetch context for upcoming meetings |
| `ExpenseTrackerAgent` | productivity | No | Track and categorize spending |
| `LanguageCoachAgent` | lifestyle | Yes | Language learning exercises and reminders |
| `NewsCuratorAgent` | lifestyle | Yes | Personalized news digest |
| `SleepAnalyzerAgent` | health | No | Analyze sleep patterns from device data |

### Credit Gating

Background agents that require cloud LM access consume credits:

| Tier | Agent Slots | Credit Model |
|------|------------|--------------|
| Free | 0 | No background agents |
| Standard | 2 | Credits per run (based on `estimatedTokens`) |
| Plus | 5 | Credits per run |
| Ultimate | 10 | Credits per run |

Local agents (on-device only, `requiresCloud: false`) do not consume credits and are free on all tiers. The `shouldRun()` method checks battery level, connectivity, and time-of-day before executing, so agents don't run in inappropriate conditions (e.g., no morning briefing at midnight, no commute agent on weekends).

## Source Files

| File | Description |
|------|-------------|
| `humbl_core/lib/services/humbl_agent.dart` | HumblAgent, AgentResult, DeviceInputMapping |
| `humbl_core/lib/services/agent_session.dart` | AgentSession, SessionManager, SessionState |
| `humbl_core/lib/services/service_event_bus.dart` | ServiceEventBus, ServiceEvent, built-in events |
| `humbl_core/lib/agents/i_background_agent.dart` | IBackgroundAgent interface, AgentContext, AgentCategory |
| `humbl_core/lib/agents/agent_manager.dart` | AgentManager (scheduling, lifecycle) |
| `humbl_core/lib/agents/builtin/` | 10 built-in agent implementations |
