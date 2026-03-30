---
sidebar_position: 4
title: Pipeline Nodes
---

# Pipeline Nodes

All 7 nodes in the pipeline graph. Each node reads specific fields from `PipelineState`, performs its work, and returns a modified copy.

## Node Summary

| Node | Name | Reads | Writes |
|------|------|-------|--------|
| ContextAssemblyNode | `context_assembly` | inputText, userId, conversationHistory | memory, availableTools, adaptedPrompt, conversationHistory |
| ClassifyNode | `classify` | inputText, availableTools, activeToolName | intent, confidence, routeDecision, intentStatus, activeToolName, toolParams |
| RouteDecisionNode | `route_decision` | routeDecision, intent, confidence | routeDecision (refined), statusMessage |
| AskUserNode | `ask_user` | followUpQuestion | outputText, outputModality |
| ExecuteToolNode | `execute_tool` | activeToolName, toolParams, userConfirmed | toolResult, needsConfirmation, confirmationMessage |
| DeliverNode | `deliver` | toolResult, cloudResponse, outputText | outputText, memoryWritten, journalLogged |
| LoopCheckNode | `loop_check` | pendingSteps, pendingToolCalls, iterationCount | (routes back or terminates) |

## ContextAssemblyNode

**Name:** `context_assembly`

Assembles the full context for classification: queries memory, filters available tools, formats conversation history.

- Calls `IMemoryService.assembleContext()` to get relevant memories.
- Filters `ToolRegistry.allTools` by user tier, device connectivity, and tool state.
- Exports available tool schemas via `toMcpSchema()` for the LM.
- Applies `IPromptAdapter` if configured (model-specific prompt formatting).
- Subscribes to `ToolRegistry.toolsChanged` to rebuild tool list dynamically.

## ClassifyNode

**Name:** `classify`

Classifies user intent using a tiered approach:

1. **Tier 0 (pre-classified):** If `activeToolName` is already set (from device mapping or scout agent), skip classification entirely.
2. **Tier 1 (keyword matching):** Reserved for future lightweight keyword-based routing.
3. **Tier 2 (LM classification):** Sends the input text and available tools to `ILmGateway.complete()` and parses the structured JSON response.

The LM response is expected to be structured JSON:

```json
{"type": "tool_call", "tool": "wifi_toggle", "params": {"enabled": true}}
```

or

```json
{"type": "chat", "response": "I can help with that."}
```

Sets `routeDecision` based on classification result:
- Tool call with high confidence: `ExecutionPath.fast`
- Tool call with low confidence or missing params: `ExecutionPath.slmLoop`
- Complex query: `ExecutionPath.cloudLoop`
- Chat response: delivered directly via `ExecutionPath.fast`

## RouteDecisionNode

**Name:** `route_decision`

Validates and refines the route decision from ClassifyNode. Checks:

- Is the selected tool available in the current context?
- Does the user's tier allow cloud routing?
- Is connectivity sufficient for the chosen path?

Sets `statusMessage` for UI progress indicator.

## AskUserNode

**Name:** `ask_user`

Handles follow-up questions when the SLM needs more information. Sets `outputText` to the follow-up question and `outputModality` based on input modality.

## ExecuteToolNode

**Name:** `execute_tool`

Executes the selected tool through the `ToolRegistry`:

1. Looks up tool by `activeToolName`.
2. Builds a `ToolContext` from the pipeline state.
3. Calls `tool.execute(ctx, params)` (the @nonVirtual template handles all gate checks).
4. If the tool returns `confirmationRequired`, sets `needsConfirmation = true` and `confirmationMessage`.
5. Otherwise, stores the `ToolResult` in state.

If `resourceManager` is provided, Gate 3 (resource leasing) is enforced automatically by the `HumblTool.execute()` template.

## DeliverNode

**Name:** `deliver`

Formats the final output and persists state:

1. Constructs `outputText` from `toolResult`, `cloudResponse`, or existing `outputText`.
2. Writes the interaction to `IMemoryService.logInteraction()` (if available).
3. Appends turns to `ConversationStore` (if available).
4. Sets `memoryWritten` and `journalLogged` flags.

## LoopCheckNode

**Name:** `loop_check`

Decides whether the pipeline should loop or terminate:

- If `pendingSteps` is non-empty, routes back to `classify` (multi-step plan).
- If `pendingToolCalls` is non-empty (from cloud response with multiple tool calls), routes back to `execute_tool`.
- If iteration count exceeds the max (20), returns error.
- Otherwise, returns null (pipeline terminates).

## Node File Locations

| Node | File |
|------|------|
| ContextAssemblyNode | `humbl_core/lib/pipeline/nodes/context_assembly_node.dart` |
| ClassifyNode | `humbl_core/lib/pipeline/nodes/classify_node.dart` |
| RouteDecisionNode | `humbl_core/lib/pipeline/nodes/route_decision_node.dart` |
| AskUserNode | `humbl_core/lib/pipeline/nodes/ask_user_node.dart` |
| ExecuteToolNode | `humbl_core/lib/pipeline/nodes/execute_tool_node.dart` |
| DeliverNode | `humbl_core/lib/pipeline/nodes/deliver_node.dart` |
| LoopCheckNode | `humbl_core/lib/pipeline/nodes/loop_check_node.dart` |
