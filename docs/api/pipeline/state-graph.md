---
sidebar_position: 3
title: StateGraph
---

# StateGraph

Deterministic routing engine. LangGraph-compatible pattern in pure Dart. No LLM involved in routing -- nodes and edges are static, testable, zero token cost.

**File:** `humbl_core/lib/pipeline/state_graph.dart`

## Class Signature

```dart
class StateGraph {
  void addNode(GraphNode node);
  void addEdge(Edge edge);
  void setEntryPoint(String nodeName);
  void setEndNode(String nodeName);
  void setMaxSteps(int n);

  Future<PipelineState> run(
    PipelineState initialState, {
    CancellationToken? cancellation,
    Duration? nodeTimeout,
    void Function(PipelineState)? onCheckpoint,
    Stream<PipelineInterrupt>? interrupts,
  });

  Stream<PipelineState> runStream(
    PipelineState initialState, {
    CancellationToken? cancellation,
    Duration? nodeTimeout,
    void Function(PipelineState)? onCheckpoint,
    Stream<PipelineInterrupt>? interrupts,
  });

  List<String> get nodeNames;
  bool hasNode(String name);
  String? get entryPoint;
}
```

## GraphNode

Abstract base for all pipeline nodes:

```dart
abstract class GraphNode {
  String get name;
  Future<PipelineState> process(PipelineState state);
}
```

## Edge

Edges connect nodes. Two types:

```dart
class Edge {
  final String from;
  final String? staticTarget;
  final String? Function(PipelineState)? condition;

  // Direct edge: always goes to the same target
  Edge.direct({required String from, required String to});

  // Conditional edge: target determined by state
  Edge.conditional({
    required String from,
    required String? Function(PipelineState) condition,
  });

  String? resolve(PipelineState state);
}
```

## Execution Algorithm

1. Start at entry point node.
2. Before each node: check `CancellationToken`, check buffered interrupts.
3. Execute `node.process(state)` (with optional timeout).
4. After each node: call `onCheckpoint` if provided.
5. If state has error, stop.
6. If at end node, stop.
7. Resolve next node from outgoing edges.
8. If no next node, stop (implicit end).
9. If max steps exceeded, return error.

### Interrupt Handling

Interrupts are buffered from the `interrupts` stream and checked before each node:

| Interrupt | Action |
|-----------|--------|
| `UserCancel` | Stop with recoverable error |
| `ExternalEvent(critical)` | Stop with non-recoverable error |
| `ExternalEvent(high)` | Stop with recoverable error |
| `SystemAlert(abort)` | Stop with non-recoverable error |
| Other | Log and continue |

## Usage Example

```dart
final graph = StateGraph()
  ..addNode(ClassifyNode(gateway))
  ..addNode(RouteDecisionNode())
  ..addNode(ExecuteToolNode(registry))
  ..addNode(DeliverNode(memoryService))
  ..addEdge(Edge.direct(from: 'classify', to: 'route_decision'))
  ..addEdge(Edge.conditional(
    from: 'route_decision',
    condition: (s) => s.routeDecision == ExecutionPath.fast
        ? 'execute_tool' : 'deliver',
  ))
  ..addEdge(Edge.direct(from: 'execute_tool', to: 'deliver'))
  ..setEntryPoint('classify')
  ..setMaxSteps(20);

final result = await graph.run(initialState);
```
