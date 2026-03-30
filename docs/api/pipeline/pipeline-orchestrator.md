---
sidebar_position: 1
title: PipelineOrchestrator
---

# PipelineOrchestrator

Pre-wired pipeline graph that supports concurrent runs. Entry point for processing user utterances.

**File:** `humbl_core/lib/pipeline/pipeline_orchestrator.dart`

## Constructor

```dart
PipelineOrchestrator({
  required ILmGateway lmGateway,
  required ModelRegistry modelRegistry,
  required ToolRegistry toolRegistry,
  ISystemJournal? journal,
  IHardwareResourceManager? resourceManager,
  IMemoryService? memoryService,
  ConversationStore? conversationStore,
  IPromptAdapter? promptAdapter,
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lmGateway` | `ILmGateway` | Yes | Routes LM requests to the best available provider |
| `modelRegistry` | `ModelRegistry` | Yes | Model metadata and capability registry |
| `toolRegistry` | `ToolRegistry` | Yes | All registered tools |
| `journal` | `ISystemJournal?` | No | Persistent event logging |
| `resourceManager` | `IHardwareResourceManager?` | No | Hardware lease management for Gate 3 |
| `memoryService` | `IMemoryService?` | No | Memory context assembly (defaults to `NoopMemoryService`) |
| `conversationStore` | `ConversationStore?` | No | Persistent conversation turns |
| `promptAdapter` | `IPromptAdapter?` | No | Adapts prompts for different model formats |

## Methods

### run()

```dart
Future<PipelineState> run(PipelineState initialState);
```

Runs a complete pipeline turn synchronously. Returns the final `PipelineState` after all nodes have executed. Concurrent runs are safe -- each call operates on its own state copy.

### runStream()

```dart
Stream<PipelineState> runStream(PipelineState initialState);
```

Stream version of `run()`. Yields state after each node for real-time UI progress indicators. The last yielded state is the final result.

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `totalRunCount` | `int` | Number of pipeline runs started (diagnostics) |
| `gateway` | `ILmGateway` | The injected LM gateway |
| `graph` | `StateGraph` | The underlying graph (for testing/introspection) |
| `toolRegistry` | `ToolRegistry` | The injected tool registry |
| `modelRegistry` | `ModelRegistry` | The injected model registry |
| `journal` | `ISystemJournal?` | The injected journal |
| `resourceManager` | `IHardwareResourceManager?` | The injected resource manager |

## Graph Topology

```
context_assembly → classify → route_decision
                                ├─ tool_call → execute_tool → deliver → loop_check
                                ├─ follow_up → ask_user → deliver → loop_check
                                └─ chat → deliver → loop_check → END
```

Loop check can route back to `classify` (multi-step) or `execute_tool` (pending tool calls from cloud response).

## Usage Example

```dart
final orchestrator = PipelineOrchestrator(
  lmGateway: gateway,
  modelRegistry: modelRegistry,
  toolRegistry: toolRegistry,
  memoryService: memoryService,
);

// Synchronous run
final result = await orchestrator.run(PipelineState(
  inputText: 'Turn on WiFi',
  sessionId: 'session-1',
  runId: 'run-1',
  userId: 'user-1',
  tier: UserTier.standard,
  device: deviceState,
));

// Streaming run (for UI progress)
await for (final state in orchestrator.runStream(initialState)) {
  updateUI(state.currentNode, state.statusMessage);
}
```
