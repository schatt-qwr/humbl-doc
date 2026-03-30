---
sidebar_position: 1
title: HumblAgent
---

# HumblAgent

The always-free main agent. Event loop dispatcher that maps to LangGraph's AgentExecutor. Never blocks, supports concurrent pipeline runs, and manages scout agents.

**File:** `humbl_core/lib/services/humbl_agent.dart`

## Class Signature

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

## AgentResult

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

## DeviceInputMapping

```dart
class DeviceInputMapping {
  final String inputEvent;
  final String? toolName;
  final Map<String, dynamic>? toolParams;
  final String? pipelineInput;
  final InputPriority priority;
  final bool isCustomizable;
  final String displayName;
}
```

## spawnScout()

Spawns a pre-configured pipeline run that skips classification:

```dart
final stream = agent.spawnScout(
  taskId: 'check_weather',
  toolName: 'weather_check',
  toolParams: {'location': 'current'},
);

await for (final state in stream) {
  print('Scout progress: ${state.currentNode}');
}
```

Scouts set `activeToolName` and `intentStatus: complete` in the initial state, causing `ClassifyNode` to pass through (Tier 0).

For full details, see [Services & Agent](../../architecture/supporting/services-agent).
