---
sidebar_position: 2
title: PipelineState
---

# PipelineState

The immutable typed state object that flows through every node in the graph. Each node reads the fields it needs and returns a modified copy via `copyWith()`.

**File:** `humbl_core/lib/pipeline/pipeline_state.dart`

## Fields by Category

### Input

| Field | Type | Description |
|-------|------|-------------|
| `inputText` | `String` | The user's input text |
| `inputModality` | `InputModality` | `voice`, `text`, `vision`, `gesture` |
| `sessionId` | `String` | Current session identifier |
| `runId` | `String` | Unique identifier for this pipeline run |

### Tracing

| Field | Type | Description |
|-------|------|-------------|
| `traceId` | `String?` | UUID for end-to-end log correlation |
| `startedAt` | `DateTime?` | When the run started |

### User & Device

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `String` | Authenticated user ID |
| `tier` | `UserTier` | `free`, `standard`, `plus`, `ultimate` |
| `device` | `DeviceState` | Battery, network, thermal, glasses connection |

### Routing

| Field | Type | Description |
|-------|------|-------------|
| `routingPolicy` | `RoutingPolicy` | SLM-first, cloud-first, etc. |

### Intent Classification

| Field | Type | Description |
|-------|------|-------------|
| `intent` | `Intent?` | Classified intent (tool name, domain, params) |
| `confidence` | `double?` | Classification confidence (0.0--1.0) |
| `routeDecision` | `ExecutionPath?` | `fast`, `slmLoop`, `cloudLoop`, `cloudAlways` |
| `intentStatus` | `IntentProcessorStatus?` | Status of the classification |
| `followUpQuestion` | `String?` | Question to ask user for clarification |

### Memory Context

| Field | Type | Description |
|-------|------|-------------|
| `memory` | `MemoryContext` | Relevant memories and active conversation |
| `conversationHistory` | `List<Map<String, dynamic>>` | Recent conversation turns |

### Available Tools

| Field | Type | Description |
|-------|------|-------------|
| `availableTools` | `List<Map<String, dynamic>>` | MCP schemas filtered by tier, connectivity, state |

### Tool Execution

| Field | Type | Description |
|-------|------|-------------|
| `activeToolName` | `String?` | Tool selected for execution |
| `toolParams` | `Map<String, dynamic>?` | Parameters for the tool |
| `toolResult` | `ToolResult?` | Result from tool execution |

### Cloud

| Field | Type | Description |
|-------|------|-------------|
| `cloudRequired` | `bool` | Whether cloud processing is needed |
| `cloudMessages` | `List<Map<String, dynamic>>` | Messages for cloud LLM |
| `cloudResponse` | `String?` | Response from cloud LLM |
| `cloudLoopAction` | `CloudLoopAction?` | `toolCall`, `followUp`, `finalResponse` |
| `pendingToolCalls` | `List<Map<String, dynamic>>` | Queued tool calls from cloud response |

### Multi-Step

| Field | Type | Description |
|-------|------|-------------|
| `kvSnapshot` | `String?` | KV state snapshot for multi-step |
| `pendingSteps` | `List<String>` | Remaining steps in multi-step plan |

### Prompt Adaptation

| Field | Type | Description |
|-------|------|-------------|
| `adaptedPrompt` | `PromptAdaptation?` | Model-specific prompt formatting |

### Model Tracking

| Field | Type | Description |
|-------|------|-------------|
| `activeModelId` | `String?` | Which model is being used |
| `activeProviderId` | `String?` | Which provider instance |
| `tokensUsed` | `int` | Tokens consumed in this run |

### Output

| Field | Type | Description |
|-------|------|-------------|
| `outputText` | `String?` | Final response text |
| `outputModality` | `OutputModality?` | `audio`, `glassesDisplay`, `companionApp`, `led`, `haptic` |
| `memoryWritten` | `bool` | Whether memory was updated |
| `journalLogged` | `bool` | Whether journal was written |

### Graph Tracking

| Field | Type | Description |
|-------|------|-------------|
| `currentNode` | `String` | Current node in the graph |
| `error` | `PipelineError?` | Error state (node, message, recoverable) |
| `statusMessage` | `String?` | Human-readable status for UI |
| `iterationCount` | `int` | Loop iterations completed |
| `cancellation` | `CancellationToken?` | Cooperative cancellation |
| `checkpoints` | `List<PipelineCheckpoint>` | Captured checkpoints for resume |

### Confirmation

| Field | Type | Description |
|-------|------|-------------|
| `needsConfirmation` | `bool` | Whether tool requires user confirmation |
| `confirmationMessage` | `String?` | Message to display to user |
| `confirmationMetadata` | `Map<String, dynamic>?` | Additional confirmation context |
| `userConfirmed` | `bool` | Set by app layer after user confirms |

## copyWith() Pattern

The `_absent` sentinel distinguishes "not provided" from "explicitly set to null":

```dart
const _absent = Object();

PipelineState copyWith({
  Object? traceId = _absent,  // Use _absent to mean "keep current"
  // ...
}) {
  return PipelineState(
    traceId: traceId == _absent ? this.traceId : traceId as String?,
    // ...
  );
}
```

This allows clearing nullable fields:

```dart
// Keep existing traceId (don't pass the parameter)
state.copyWith(outputText: 'Hello');

// Explicitly clear traceId to null
state.copyWith(traceId: null);
```

## Supporting Types

### Intent

```dart
class Intent {
  final String toolName;
  final String domain;
  final Map<String, dynamic> extractedParams;
}
```

### ExecutionPath

| Value | Description |
|-------|-------------|
| `fast` | SLM has everything, execute tool directly |
| `slmLoop` | SLM classified but needs follow-up |
| `cloudLoop` | SLM cannot handle, cloud LLM agentic loop |
| `cloudAlways` | User preference: bypass SLM |

### PipelineError

```dart
class PipelineError {
  final String node;
  final String message;
  final bool recoverable;
}
```
