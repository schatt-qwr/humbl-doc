---
sidebar_position: 1
title: Immutable State
---

# Immutable State Pattern

All state objects in the pipeline use immutable data with `copyWith()` for transitions. This eliminates an entire class of concurrency bugs.

## The _absent Sentinel

Dart does not distinguish between "not provided" and "explicitly set to null" in optional parameters. The `_absent` sentinel solves this:

```dart
const _absent = Object();

class PipelineState {
  final String? traceId;

  PipelineState copyWith({
    Object? traceId = _absent,  // Default: _absent means "keep current"
  }) {
    return PipelineState(
      traceId: traceId == _absent ? this.traceId : traceId as String?,
    );
  }
}
```

### Usage

```dart
// Keep existing traceId (parameter not passed)
state.copyWith(outputText: 'Hello');

// Explicitly set traceId to a value
state.copyWith(traceId: 'trace-123');

// Explicitly clear traceId to null
state.copyWith(traceId: null);
```

Without the sentinel, `copyWith(traceId: null)` would be indistinguishable from `copyWith()` (both pass null), making it impossible to clear a nullable field.

## Why Immutable

### Concurrent Pipeline Runs

`PipelineOrchestrator` supports concurrent `run()` calls. Each run operates on its own `PipelineState` copy. If state were mutable, two concurrent runs could corrupt each other's data.

```dart
// Safe: each run gets its own state chain
final run1 = orchestrator.run(state1);
final run2 = orchestrator.run(state2);
// run1 and run2 never share mutable state
```

### Node Isolation

Each node receives state, creates a modified copy, and returns it. The original state is never modified:

```dart
class ClassifyNode extends GraphNode {
  @override
  Future<PipelineState> process(PipelineState state) async {
    // state is never mutated
    return state.copyWith(
      intent: classifiedIntent,
      confidence: 0.95,
    );
  }
}
```

### Debugging and Replay

Immutable state chains can be logged and replayed. `runStream()` yields state after each node -- each yielded state is a complete snapshot that can be inspected independently.

## Lists in State

List fields use `List.unmodifiable()` in `copyWith()`:

```dart
PipelineState copyWith({
  List<Map<String, dynamic>>? conversationHistory,
}) {
  return PipelineState(
    conversationHistory: conversationHistory != null
        ? List.unmodifiable(conversationHistory)
        : this.conversationHistory,
  );
}
```

This prevents accidental mutation of list contents after state creation.

## Other Immutable Types

The pattern is used beyond `PipelineState`:

- `ResourceLease` -- renewals produce new instances via `renewed()`.
- `ToolResult` -- all fields final, created via named constructors.
- `ToolContext` -- uses the same `_absent` sentinel pattern in `copyWith()`.
- `JournalEvent` -- all fields final.
