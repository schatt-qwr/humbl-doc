---
sidebar_position: 1
title: HumblChatModel
---

# HumblChatModel (single LM entry point)

`HumblChatModel extends BaseChatModel` is the single LM entry point for Humbl. Replaced the previous `ILmGateway` interface in SP7.5 (2026-04-01) — the old request/response envelope types (`LmGatewayRequest`, `LmGatewayResponse`, `LmGatewayToken`) are gone; everything uses `langchain_dart` message types + `RunnableConfig`.

**File:** `humbl_core/lib/lm_gateway/humbl_chat_model.dart`

:::note Why the page title says "HumblChatModel" but the URL says "i-lm-gateway"
The doc URL hasn't been redirected yet. External links to `./i-lm-gateway` still resolve here. A cleanup pass will move this file to `humbl-chat-model.md` in a later session.
:::

## Class shape

```dart
class HumblChatModel extends BaseChatModel {
  HumblChatModel({
    required Router router,
    required QuotaManager quotaManager,
    Map<String, Set<LmProviderType>>? tierConstraints,
  });

  @override
  Future<ChatResult> generateMessages(
    List<BaseMessage> messages, {
    List<String>? stop,
    RunnableConfig? config,
  });

  // invoke() and stream() are inherited from BaseChatModel and delegate
  // to generateMessages() + the chunk-streaming default.

  void addProvider(Deployment deployment, CompletionFunction fn);
  void removeProvider(String modelId);
}
```

Under the hood, `generateMessages` consults `QuotaManager.checkRateLimit`, picks a provider via `Router`, and records usage via `QuotaManager.recordUsage` + `SpendLog`.

## Why `BaseChatModel` and not a Humbl-specific interface

Every LangChain-ecosystem feature (tools, memory, callbacks, tracers) expects `BaseChatModel`. By extending it directly, `HumblChatModel` drops straight into:

- Pipeline's `agent` node (`await model.invoke(messages, config: config)`).
- Background agents (`AgentContext.model` is `BaseChatModel`).
- Runnable composition (LCEL pipes / chains).
- Tool-aware model (`.bindTools(tools)`).

## Routing — LiteLLM Router (internal)

`HumblChatModel` wraps `Router` from `litellm_dart`. Routing strategies:

| Strategy | When |
|---|---|
| `simple` | First eligible deployment |
| `costBased` | Cheapest per-token |
| `leastBusy` | Fewest in-flight requests |
| `latencyBased` | Lowest p50 latency window |
| `usageBased` | Favor deployments furthest from their budget |

`Router` handles cooldown (exponential backoff) + fallback chains + budget enforcement internally. Humbl's concerns (tier constraints + quota) wrap it at the `HumblChatModel` layer.

## Tier constraints

A map of tier → allowed provider types. Default:

```dart
const defaultTierConstraints = {
  'free':     { onDevice, localNetwork, byokCloud },
  'standard': { onDevice, localNetwork, appCloud, byokCloud },
  'premium':  { onDevice, localNetwork, appCloud, byokCloud },
  'ultimate': { onDevice, localNetwork, appCloud, byokCloud },
};
```

Tiers gate access to `appCloud` (Humbl-subsidized cloud) but every tier can use `byokCloud` (user's own keys) and local / local-network models.

## Streaming

`stream()` is inherited from `BaseChatModel` and yields `AIMessageChunk`s. Wired into the voice pipeline (`StreamSessionCoordinator.onPipelineStream`) so LLM tokens can pipe to `TTS.synthesizeFromStream()` in real-time.

## Scheduling

For local-model inference (one `llama.cpp` instance can only serve one request at a time), wrap the model in an `LmScheduler` (see [Scheduling](./scheduling)) to get realtime / background / cloud priority queuing on top.

## Migration notes (from the old ILmGateway)

| Old call | New call |
|---|---|
| `gateway.complete(LmGatewayRequest(messages: ..., tools: ..., tier: ...))` | `model.invoke(messages, config: RunnableConfig(configurable: {'_tools': tools, 'tier': tier}))` |
| `response.toolCalls` | `aiMessage.toolCalls` (from `langchain_dart.AIMessage`) |
| `gateway.stream(...)` | `model.stream(messages, config: ...)` → `Stream<AIMessageChunk>` |
| `RequestPriority.realtime / background / batch` | `LmScheduler.invoke(messages, priority: LmPriority.realtime \| background \| cloud)` |
| `LmGatewayResponse.providerUsed / modelUsed / latencyMs` | Available via `BaseCallbackHandler.on_llm_end` callback (run metadata), not on the message itself. |

The old `LmGatewayRequest` + `LmGatewayResponse` envelope types are fully deleted — grep-replace them with `langchain_dart` primitives.
