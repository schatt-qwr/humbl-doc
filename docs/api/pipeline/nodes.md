---
sidebar_position: 4
title: Pipeline Nodes
---

# Pipeline Nodes

The 4 nodes in the current pipeline graph (post-SP6 refactor, 2026-03-31). Built via `buildHumblPipeline()` in `humbl_core/lib/pipeline/build_pipeline.dart`, compiled on top of `StateGraph` from `langchain_graph`.

:::note Historical
The earlier 7-node shape (`ContextAssemblyNode` / `ClassifyNode` / `RouteDecisionNode` / `AskUserNode` / `ExecuteToolNode` / `DeliverNode` / `LoopCheckNode`) was collapsed into this 4-node flow during SP6. Intent classification + route decision are now handled inside the `agent` node by the `HumblChatModel` itself (tool calls vs direct chat response), with conditional edges driving the tool-execution loop.
:::

## Node Summary

| Node | Name | Reads | Writes |
|------|------|-------|--------|
| `createContextAssemblyNode` | `context_assembly` | `messages` | `messages` (augmented with system + retrieved memory) |
| Agent node (inline in `buildHumblPipeline`) | `agent` | `messages` | `messages` (new `AIMessage`, possibly with tool calls) |
| `createToolsNode` | `tools` | `messages` (last `AIMessage.toolCalls`) | `messages` (new `ToolMessage`(s)) |
| `createDeliverNode` | `deliver` | `messages` | (writes to memory + conversation store) |

## Graph topology

```
START
  │
  ▼
context_assembly
  │
  ▼
agent ────── conditional ──────┐
  │   has tool calls?          │
  │   → tools                  │
  │   otherwise → deliver      │
  ▼                            ▼
tools                        deliver
  │                            │
  └──→ agent (loop back)       ▼
                              END
```

Edges (from `build_pipeline.dart`):

```dart
graph.addEdge(START, 'context_assembly');
graph.addEdge('context_assembly', 'agent');
graph.addConditionalEdges('agent', _toolsCondition);
graph.addEdge('tools', 'agent');
graph.addEdge('deliver', END);
```

`_toolsCondition` routes to `'tools'` when the last `AIMessage` carries tool calls; otherwise it routes to `'deliver'`.

## context_assembly

**Factory:** `createContextAssemblyNode({memory, toolRegistry, promptAdapter})`

**Responsibility:** Prepare the `messages` channel for the agent. Queries `IMemoryService.assembleContext()` for relevant T2/T3/T4 memory, filters `ToolRegistry.allTools` by user tier + device connectivity + tool state, applies the optional `IPromptAdapter` for model-specific prompt formatting, and prepends the resulting system message to the channel.

**File:** `humbl_core/lib/pipeline/nodes/context_assembly_node.dart`

## agent

**Declared inline in** `build_pipeline.dart`:

```dart
graph.addNode('agent', (state) async {
  final messages = state['messages'] as List<BaseMessage>? ?? [];
  final config = getRuntimeConfig();
  final response = await model.invoke(messages, config: config);
  return {'messages': <BaseMessage>[response]};
});
```

**Responsibility:** Call `HumblChatModel.invoke()` (which routes through LiteLLM `Router` → provider → model). The returned `AIMessage` either carries tool calls (condition routes to `tools`) or is a direct chat response (condition routes to `deliver`).

No standalone node file — the logic is short enough to live in `build_pipeline.dart`.

## tools

**Factory:** `createToolsNode(toolRegistry)`

**Responsibility:** Delegates to the framework `ToolNode` from `langchain_graph/prebuilt`. For each tool call on the last `AIMessage`, looks up the tool in `ToolRegistry`, executes it through the named-gate chain (Policy → Access → Permission → validate → Quota → Resource), and appends a `ToolMessage` with the result. Confirmation-required tools raise a `GraphInterrupt` for the app to surface the prompt; on resume, execution continues.

**File:** `humbl_core/lib/pipeline/nodes/execute_tool_node.dart` (retains the pre-SP6 filename).

## deliver

**Factory:** `createDeliverNode({memory, conversationStore})`

**Responsibility:** Final sink. Writes the completed turn to `IMemoryService.logInteraction()` (T4 audit) and appends messages to `ConversationStore`. The pipeline's consumer reads the last `AIMessage` content from the final graph state.

**File:** `humbl_core/lib/pipeline/nodes/deliver_node.dart`

## Where the old node responsibilities went

| Old 7-node name | New location |
|-----------------|--------------|
| `ContextAssemblyNode` | Same — kept as `context_assembly` node. |
| `ClassifyNode` | The `HumblChatModel` inside the `agent` node decides whether to call a tool or chat — classification happens as part of the agent's normal forward pass, not a separate node. |
| `RouteDecisionNode` | Gone. The `_toolsCondition` conditional edge replaces it. |
| `AskUserNode` | Gone as a node. Tools that need user input raise `GraphInterrupt` via the confirmation framework; agent iteration picks up after resume. |
| `ExecuteToolNode` | Renamed to the `tools` node. Delegates to framework `ToolNode`. |
| `DeliverNode` | Same — kept as `deliver` node. |
| `LoopCheckNode` | Gone. Framework `recursionLimit` (default 20) + conditional edges enforce termination. |

## Checkpointing

The compiled graph accepts a `BaseCheckpointSaver` at compile time (`buildHumblPipeline(checkpointer: ...)`). `humbl_core` extends `ICheckpointStore` from `BaseCheckpointSaver` so the app can persist intermediate states (SQLite in production, `InMemorySaver` in tests).

## Cancellation

`RunnableConfig.configurable['_cancellationToken']` is read inside long-running nodes. The token is propagated from the app layer (`StreamSessionCoordinator` or scout-agent dispatcher) through `getRuntimeConfig()`. Not yet enforced in every node — tracked in `memory/pending-design-items.md`.
